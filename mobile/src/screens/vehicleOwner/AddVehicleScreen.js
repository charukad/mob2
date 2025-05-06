import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity, Image } from 'react-native';
import { TextInput, Button, Text, Divider, IconButton, Title, Caption } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, spacing } from '../../constants/theme';
import { addVehicle } from '../../store/slices/vehiclesSlice';
import { loadUser } from '../../store/slices/authSlice';
import { DEV_API_URL, getApiUrl } from '../../constants/api';

// Network check utility function
const checkServerConnection = async (customUrl = null) => {
  try {
    // Get the base URL to check
    const baseUrl = customUrl || DEV_API_URL;
    
    // Try a simple fetch to check if the server is reachable
    console.log(`Checking connectivity to server: ${baseUrl}`);
    
    // Use a timeout to avoid long waits
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    // Remove /api from the end if it exists
    const serverBaseUrl = baseUrl.endsWith('/api') 
      ? baseUrl.substring(0, baseUrl.length - 4)
      : baseUrl;
      
    // Try multiple endpoints to see if any respond
    const endpoints = ['/', '/api', '/health'];
    
    for (const endpoint of endpoints) {
      try {
        const testUrl = serverBaseUrl + endpoint;
        console.log(`Trying endpoint: ${testUrl}`);
        
        const response = await fetch(testUrl, {
          method: 'GET',
          signal: controller.signal,
        });
        
        if (response.ok || response.status === 404) {
          // Even a 404 means the server is reachable
          console.log(`Server connection successful via ${endpoint}`);
          clearTimeout(timeoutId);
          return true;
        }
      } catch (endpointError) {
        console.log(`Failed on endpoint ${endpoint}:`, endpointError.message);
        // Continue to the next endpoint
      }
    }
    
    clearTimeout(timeoutId);
    console.log('Server connection failed: Server not responding on any endpoint');
    return false;
  } catch (error) {
    console.log('Server connection failed:', error);
    return false;
  }
};

// Test different API URLs for connection
const testApiUrls = async () => {
  const yourIp = '192.168.1.2'; // Replace with your actual IP
  
  const urls = [
    {name: 'localhost', url: 'http://localhost:5008/api'},
    {name: '127.0.0.1', url: 'http://127.0.0.1:5008/api'},
    {name: '10.0.2.2 (Android)', url: 'http://10.0.2.2:5008/api'},
    {name: 'Your IP', url: `http://${yourIp}:5008/api`},
  ];
  
  const results = [];
  
  // Test normal API connectivity test
  results.push('===== SERVER PING TEST =====');
  for (const entry of urls) {
    const success = await checkServerConnection(entry.url);
    results.push(`${entry.name}: ${success ? '✅' : '❌'}`);
  }
  
  // Also try direct API fetch for vehicles
  results.push('\n===== DIRECT API TEST =====');
  for (const entry of urls) {
    try {
      console.log(`Trying direct API fetch: ${entry.url}/vehicles`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${entry.url}/vehicles`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      results.push(`${entry.name} (API): ${response.status < 500 ? '✅' : '❌'}`);
    } catch (error) {
      results.push(`${entry.name} (API): ❌ - ${error.message.substring(0, 30)}`);
    }
  }
  
  // Test POST API endpoint with a single working URL
  const authToken = await AsyncStorage.getItem('authToken');
  if (authToken) {
    try {
      // Pick one URL to test POST with
      const testUrl = 'http://10.0.2.2:5008/api'; // Try Android emulator URL
      const testPayload = {
        make: 'Test',
        model: 'Vehicle',
        year: 2020,
        registrationNumber: 'TEST' + Date.now(),
        type: 'car',
        capacity: {
          passengers: 4
        },
        features: ['Test'],
        description: 'Test vehicle',
        isAvailable: true
      };
      
      console.log(`Trying direct POST: ${testUrl}/vehicles`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${testUrl}/vehicles`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        results.push(`\nPOST Test: ✅ Success!`);
        console.log('POST response:', data);
      } else {
        const errorText = await response.text();
        results.push(`\nPOST Test: ❌ Status ${response.status}`);
        console.log('POST error:', errorText);
      }
    } catch (error) {
      results.push(`\nPOST Test: ❌ Error: ${error.message.substring(0, 50)}`);
      console.log('POST exception:', error);
    }
  }
  
  Alert.alert(
    'API Connection Test Results',
    results.join('\n'),
    [{ text: 'OK' }]
  );
};

// Auto-test and select the best API URL
const findWorkingApiUrl = async () => {
  const urls = [
    {name: 'localhost', url: 'http://localhost:5008/api'},
    {name: '127.0.0.1', url: 'http://127.0.0.1:5008/api'},
    {name: '10.0.2.2', url: 'http://10.0.2.2:5008/api'},
    {name: 'IP', url: 'http://192.168.1.2:5008/api'},
    {name: 'ER', url: 'http://192.168.0.102:5008/api'}, // Additional IP to try
  ];
  
  // First try with auth headers if available
  try {
    const authToken = await AsyncStorage.getItem('authToken');
    if (authToken) {
      console.log('Testing URLs with authentication...');
      
      for (const entry of urls) {
        try {
          console.log(`Testing authenticated URL: ${entry.url}`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          // Try health endpoint first (more reliable than vehicles endpoint)
          const response = await fetch(`${entry.url}/health`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          // Any response is good
          if (response.status) {
            console.log(`Found working authenticated URL: ${entry.url} (Status: ${response.status})`);
            return entry.url;
          }
        } catch (error) {
          console.log(`Authenticated URL ${entry.url} failed:`, error.message);
          // Continue to next URL
        }
      }
    }
  } catch (error) {
    console.log('Error getting auth token:', error);
  }
  
  // Fallback - try without auth
  for (const entry of urls) {
    try {
      console.log(`Testing URL without auth: ${entry.url}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`${entry.url}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Any status code is good enough to know server is reachable
      console.log(`Found working URL: ${entry.url} with status ${response.status}`);
      return entry.url;
    } catch (error) {
      console.log(`URL ${entry.url} failed:`, error.message);
      // Continue to next URL
    }
  }
  
  // Last resort - try connecting to root URL for any response
  for (const entry of urls) {
    try {
      const baseUrl = entry.url.replace('/api', '');
      console.log(`Testing base URL: ${baseUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(baseUrl, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // If we get any response, the server is reachable
      console.log(`Server at ${baseUrl} is reachable, status: ${response.status}`);
      return entry.url; // Return the full API URL
    } catch (error) {
      console.log(`Base URL ${entry.url.replace('/api', '')} failed:`, error.message);
    }
  }
  
  console.log('No working URL found, returning default');
  return DEV_API_URL; // Return default as fallback
};

const AddVehicleScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  
  // Temporary: Force vehicle owner as verified for development
  useEffect(() => {
    if (user?.role === 'vehicleOwner' && (!user?.vehicleOwner?.isVerified)) {
      // Mock the verification for development purposes
      console.log('Temporarily mocking vehicle owner as verified for development');
      
      // In a real app, we would dispatch an action to update the auth state
      // For demo, we can mock the data directly in the current user object
      if (user.vehicleOwner) {
        user.vehicleOwner.isVerified = true;
      } else {
        user.vehicleOwner = { isVerified: true };
      }
    }
  }, [user]);
  
  // Check server connectivity on mount
  useEffect(() => {
    const checkConnection = async () => {
      const isConnected = await checkServerConnection();
      if (!isConnected) {
        Alert.alert(
          'Server Connection Issue',
          'Unable to connect to the server. The app might be using the wrong server address. Please check your server connection settings.',
          [{ text: 'OK' }]
        );
      }
    };
    
    checkConnection();
  }, []);
  
  // Form state
  const [vehicleData, setVehicleData] = useState({
    model: '',
    year: '',
    registrationNumber: '',
    type: '',
    capacity: '',
    make: '', // Added to match server model
  });
  const [errors, setErrors] = useState({});
  const [photos, setPhotos] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const updateVehicleData = (field, value) => {
    setVehicleData({
      ...vehicleData,
      [field]: value,
    });
    
    // Clear error when user types
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: null,
      });
    }
  };

  // Request permission for camera and photo library
  useEffect(() => {
    (async () => {
      // Request media library permissions
      const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaLibraryStatus !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload vehicle photos.');
      }
    })();
  }, []);

  // Function to pick images from gallery
  const pickImages = async () => {
    try {
      if (photos.length >= 5) {
        Alert.alert('Maximum Photos', 'You can add a maximum of 5 photos per vehicle.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 5 - photos.length,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Limit total number of photos to 5
        const newPhotos = result.assets.map(asset => asset.uri);
        const combinedPhotos = [...photos, ...newPhotos];
        
        if (combinedPhotos.length > 5) {
          const remainingSlots = 5 - photos.length;
          Alert.alert('Photo Limit', `Only added ${remainingSlots} photos to reach the maximum of 5.`);
          setPhotos([...photos, ...newPhotos.slice(0, remainingSlots)]);
        } else {
          setPhotos(combinedPhotos);
        }
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images from gallery.');
    }
  };

  // Function to remove a photo
  const removePhoto = (index) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  // Function to upload vehicle photos
  const uploadVehiclePhotos = async (vehicleId, photoUris, authToken) => {
    if (!photoUris || photoUris.length === 0) {
      return;
    }
    
    console.log(`Attempting to upload ${photoUris.length} photos for vehicle ID: ${vehicleId}`);
    
    // Create form data for image upload
    const formData = new FormData();
    
    // Append each photo to the FormData
    photoUris.forEach((uri, index) => {
      // Get the file name and extension
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const extension = match ? match[1].toLowerCase() : 'jpg';
      const type = extension === 'png' ? 'image/png' : 
                  extension === 'gif' ? 'image/gif' : 'image/jpeg';
      
      console.log(`Adding photo ${index + 1}/${photoUris.length}: ${filename} (${type})`);
      
      // On iOS, formData requires this exact structure for multer to parse correctly
      formData.append('photos', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type
      });
    });
    
    // Log the form data for debugging
    console.log('FormData created with photos:', photoUris.length);
    
    // Try multiple server URLs
    const possibleUrls = [
      `http://localhost:5008/api/vehicles/${vehicleId}/photos`,
      `http://10.0.2.2:5008/api/vehicles/${vehicleId}/photos`,
      `http://127.0.0.1:5008/api/vehicles/${vehicleId}/photos`
    ];
    
    let lastError = null;
    
    for (const url of possibleUrls) {
      try {
        console.log(`Trying to upload photos to: ${url}`);
        
        // Using fetch with appropriate headers (similar to axios)
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: formData
        });
        
        console.log(`Upload response status: ${response.status}`);
        
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        // Check if response is successful
        if (response.ok) {
          // Try to parse JSON if possible
          let result;
          try {
            result = JSON.parse(responseText);
          } catch (e) {
            console.log('Response was not JSON:', responseText);
            result = { success: true, message: 'Photos uploaded' };
          }
          
          console.log('Photos uploaded successfully:', result);
          return result;
        } else {
          lastError = new Error(`Server responded with status ${response.status}: ${responseText}`);
        }
      } catch (error) {
        console.error(`Error uploading photos to ${url}:`, error);
        lastError = error;
      }
    }
    
    // Throw the last error if all upload attempts failed
    if (lastError) {
      throw lastError;
    } else {
      throw new Error('Failed to upload photos to any server URL');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!vehicleData.model.trim()) {
      newErrors.model = 'Vehicle model is required';
    }
    
    if (!vehicleData.year.trim()) {
      newErrors.year = 'Year is required';
    } else if (!/^\d{4}$/.test(vehicleData.year.trim())) {
      newErrors.year = 'Please enter a valid 4-digit year';
    }
    
    if (!vehicleData.registrationNumber.trim()) {
      newErrors.registrationNumber = 'Registration number is required';
    }
    
    if (!vehicleData.type.trim()) {
      newErrors.type = 'Vehicle type is required';
    } else {
      // Check if type is one of the allowed values
      const allowedTypes = ['car', 'van', 'suv', 'bus', 'motorcycle', 'tuk-tuk', 'bicycle', 'other'];
      const typeValue = vehicleData.type.toLowerCase().trim();
      
      // Check for common typos that we can fix
      const isTypoFixable = ['byclycle', 'bycicle', 'bicyle', 'motorbike', 'tuktuk', 'tuk tuk'].includes(typeValue);
      
      if (!allowedTypes.includes(typeValue) && !isTypoFixable) {
        newErrors.type = `Invalid vehicle type. Must be one of: ${allowedTypes.join(', ')}`;
      }
    }
    
    if (!vehicleData.capacity.trim()) {
      newErrors.capacity = 'Capacity is required';
    } else if (!/^\d+$/.test(vehicleData.capacity.trim())) {
      newErrors.capacity = 'Capacity must be a number';
    }
    
    if (!vehicleData.make.trim()) {
      newErrors.make = 'Vehicle make is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Auto-correct vehicle type to match server's allowed values
      let vehicleType = vehicleData.type.toLowerCase().trim();
      
      // Correct common typos and validate against allowed types
      const allowedTypes = ['car', 'van', 'suv', 'bus', 'motorcycle', 'tuk-tuk', 'bicycle', 'other'];
      
      // Fix common typos
      if (vehicleType === 'byclycle' || vehicleType === 'bycicle' || vehicleType === 'bicyle') {
        vehicleType = 'bicycle';
      } else if (vehicleType === 'motorbike') {
        vehicleType = 'motorcycle';
      } else if (vehicleType === 'tuktuk' || vehicleType === 'tuk tuk') {
        vehicleType = 'tuk-tuk';
      }
      
      // If type is not in allowed list, default to 'other'
      if (!allowedTypes.includes(vehicleType)) {
        console.log(`Vehicle type "${vehicleType}" not in allowed list. Setting to "other"`);
        vehicleType = 'other';
      }
      
      // Format the data for submission to match server model
      const formattedData = {
        model: vehicleData.model,
        year: parseInt(vehicleData.year),
        registrationNumber: vehicleData.registrationNumber,
        type: vehicleType, // Use the corrected type
        make: vehicleData.make,
        capacity: {
          passengers: parseInt(vehicleData.capacity),
          luggage: 'Standard'
        },
        // Include all required fields from the Vehicle model
        features: ['Basic'],
        description: `${vehicleData.make} ${vehicleData.model} (${vehicleData.year})`,
        isAvailable: true,
        isVerified: false, // Default value
        verificationStatus: 'unsubmitted',
        location: {
          type: 'Point',
          coordinates: [0, 0],
          address: {
            city: 'Colombo',
            state: 'Western'
          }
        },
        includesDriver: true,
        maintenanceStatus: {
          condition: 'good'
        },
        photos: [], // We'll upload photos separately
        averageRating: 1, // Add default rating of 1 (minimum required)
        reviewCount: 0,    // Add default review count
        ownerEmail: user?.email // Include owner's email for filtering
      };
      
      console.log('Submitting vehicle data with email:', user?.email);
      console.log('Full vehicle data:', JSON.stringify(formattedData));
      
      // Make sure the user object has an email
      if (!user?.email) {
        Alert.alert(
          'Error',
          'Your user account does not have an email address. Please update your profile first.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }
      
      // Always try direct fetch first with multiple URLs
      try {
        // Get an auth token
        const authToken = await AsyncStorage.getItem('authToken');
        
        if (!authToken) {
          throw new Error('No auth token available');
        }
        
        // Try multiple possible URLs directly
        const possibleUrls = [
          'http://localhost:5008/api/vehicles',
          'http://10.0.2.2:5008/api/vehicles',
          'http://127.0.0.1:5008/api/vehicles'
        ];
        
        let fetchSucceeded = false;
        let fetchResult = null;
        let vehicleId = null;
        
        for (const url of possibleUrls) {
          try {
            console.log(`Trying direct fetch to: ${url}`);
            
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
              },
              body: JSON.stringify(formattedData)
            });
            
            // Check if response is ok (status in the range 200-299)
            if (response.ok) {
              const result = await response.json();
              console.log('Direct fetch successful:', result);
              console.log('Added vehicle with ID:', result.vehicle?._id || result._id || result.data?.vehicle?._id || 'unknown');
              console.log('Added vehicle with email:', result.vehicle?.ownerEmail || result.ownerEmail || 'not found');
              
              fetchSucceeded = true;
              fetchResult = result;
              
              // Get the vehicle ID for photo upload
              vehicleId = result.vehicle?._id || result._id || result.data?.vehicle?._id;
              
              // Handle photo upload and success navigation
              if (vehicleId) {
                await handleSuccessfulVehicleCreation(vehicleId, authToken, photos);
                return;
              }
            } else {
              const errorText = await response.text();
              console.log(`Fetch to ${url} failed with status ${response.status}:`, errorText);
            }
          } catch (urlError) {
            console.log(`Fetch to ${url} failed with error:`, urlError.message);
          }
        }
        
        if (fetchSucceeded) {
          Alert.alert(
            'Success',
            'Vehicle added successfully!',
            [{ text: 'OK', onPress: () => navigation.navigate('ManageVehicles') }]
          );
          return;
        }
        
        // If all direct fetches failed, fall back to Redux
        console.log('All direct fetch attempts failed, falling back to Redux');
      } catch (directFetchError) {
        console.log('Direct fetch approach failed:', directFetchError.message);
      }
      
      // Redux fallback
      const result = await dispatch(addVehicle(formattedData)).unwrap();
      console.log('Vehicle added successfully via Redux:', result);
      
      // Get vehicle ID from Redux result
      const vehicleId = result?.vehicle?._id || result?._id || result?.data?.vehicle?._id;
      
      // Handle photo upload and success navigation
      const authToken = await AsyncStorage.getItem('authToken');
      if (vehicleId && authToken) {
        await handleSuccessfulVehicleCreation(vehicleId, authToken, photos);
      } else {
        // Reload user data to refresh the vehicle list
        await dispatch(loadUser());
        
        Alert.alert(
          'Success',
          'Vehicle added successfully!',
          [{ 
            text: 'OK', 
            onPress: () => navigation.navigate('ManageVehicles')
          }]
        );
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      
      if (error?.errors) {
        // Handle validation errors from the server
        const errorMessages = Object.values(error.errors).join('\n');
        Alert.alert('Validation Error', errorMessages);
        
        // Update the local errors state to show validation errors
        const serverErrors = {};
        for (const [field, message] of Object.entries(error.errors)) {
          // Map server field names to our local field names
          const fieldMap = {
            'capacity.passengers': 'capacity',
          };
          
          const localField = fieldMap[field] || field;
          serverErrors[localField] = message;
        }
        
        setErrors({...errors, ...serverErrors});
      } else if (error?.message?.includes('verification')) {
        Alert.alert('Verification Required', 'Your account must be verified before you can add vehicles.');
      } else if (error?.message?.includes('duplicate') || error?.message?.includes('registration number already exists')) {
        Alert.alert('Duplicate Registration', 'A vehicle with this registration number already exists.');
        setErrors({
          ...errors,
          registrationNumber: 'Registration number already exists'
        });
      } else {
        Alert.alert('Error', `Failed to add vehicle: ${error?.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle successful vehicle creation and proceed to photo upload
  const handleSuccessfulVehicleCreation = async (vehicleId, authToken, photos) => {
    // Upload photos if any
    if (photos.length > 0 && vehicleId) {
      try {
        setUploadingPhotos(true);
        console.log(`Starting photo upload for vehicle ID: ${vehicleId}`);
        
        // Find the best working URL before attempting upload
        const bestUrl = await findBestWorkingUrl(authToken);
        if (bestUrl) {
          console.log(`Using best working URL for upload: ${bestUrl}`);
          
          // Use the best URL for upload
          const uploadUrl = `${bestUrl}/vehicles/${vehicleId}/photos`;
          
          try {
            await uploadDirectToUrl(uploadUrl, photos, authToken);
            console.log('Photos uploaded successfully');
          } catch (directUploadError) {
            console.error('Direct upload error:', directUploadError);
            
            // Check if user wants to try other upload methods
            return new Promise((resolve) => {
              Alert.alert(
                'Photo Upload Failed',
                'Would you like to try a different upload method?',
                [
                  {
                    text: 'Try Different Methods',
                    onPress: async () => {
                      try {
                        const result = await tryMultipleUploadStrategies(uploadUrl, photos, authToken);
                        if (result.success) {
                          Alert.alert(
                            'Success!',
                            `Photos uploaded successfully using ${result.strategy}.`,
                            [{ text: 'OK' }]
                          );
                          resolve(true);
                        } else {
                          Alert.alert(
                            'Upload Failed',
                            'All upload methods failed. You can add photos later.',
                            [{ text: 'OK' }]
                          );
                          resolve(false);
                        }
                      } catch (e) {
                        Alert.alert(
                          'Error',
                          'Failed to upload photos. You can add photos later.',
                          [{ text: 'OK' }]
                        );
                        resolve(false);
                      }
                    }
                  },
                  {
                    text: 'Skip Photos',
                    style: 'cancel',
                    onPress: () => resolve(false)
                  }
                ]
              );
            });
          }
        } else {
          // Fallback to trying multiple URLs
          console.log('No best URL found, trying multiple strategies...');
          
          // Try multiple strategies with the first URL
          const fallbackUrl = `http://localhost:5008/api/vehicles/${vehicleId}/photos`;
          const result = await tryMultipleUploadStrategies(fallbackUrl, photos, authToken);
          
          if (!result.success) {
            // If all strategies fail, show detailed error
            const failureDetails = result.results.map(r => 
              `${r.name}: ${r.status || r.error || 'Failed'}`
            ).join('\n');
            
            console.error('All upload strategies failed:', failureDetails);
            
            // Show alert but don't throw error so we still show success for vehicle creation
            Alert.alert(
              'Photo Upload Issue',
              'Your vehicle was created successfully, but we could not upload the photos. You can add photos later.',
              [{ text: 'OK' }]
            );
          } else {
            console.log(`Photos uploaded successfully using ${result.strategy}`);
          }
        }
      } catch (photoError) {
        console.error('Error uploading photos:', photoError);
        const errorMessage = photoError.message || 'Unknown error';
        
        // Log detailed error info
        console.log('Photo upload error details:', {
          message: errorMessage,
          vehicleId,
          photoCount: photos.length,
          authTokenExists: !!authToken,
        });
        
        // Don't throw - we still want to show success for vehicle creation
        Alert.alert(
          'Photo Upload Issue',
          `Vehicle was created but there was an issue uploading photos: ${errorMessage}. You can add photos later.`,
          [{ text: 'OK' }]
        );
      } finally {
        setUploadingPhotos(false);
      }
    }
    
    // Reload user data to refresh the vehicle list
    await dispatch(loadUser());
    
    // Navigate back to the manage vehicles screen
    Alert.alert(
      'Success',
      'Vehicle added successfully!',
      [{ text: 'OK', onPress: () => navigation.navigate('ManageVehicles') }]
    );
  };
  
  // Find the best working URL for API calls
  const findBestWorkingUrl = async (authToken) => {
    const possibleUrls = [
      'http://localhost:5008/api',
      'http://10.0.2.2:5008/api',
      'http://127.0.0.1:5008/api',
      // Add common local IPs
      'http://192.168.1.2:5008/api',
      'http://192.168.0.102:5008/api',
      // If you know your actual development machine's IP, add it here
      'http://192.168.1.100:5008/api'
    ];
    
    console.log('Searching for working API URL...');
    
    // If we already found a working URL in this session, try it first
    const cachedUrl = await AsyncStorage.getItem('workingApiUrl');
    if (cachedUrl) {
      try {
        console.log(`Testing cached API URL: ${cachedUrl}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`${cachedUrl}/health`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok || response.status === 404) {
          console.log(`Cached URL is working: ${cachedUrl}`);
          return cachedUrl;
        }
      } catch (error) {
        console.log(`Cached URL failed:`, error.message);
      }
    }
    
    // Try all possible URLs
    for (const baseUrl of possibleUrls) {
      try {
        console.log(`Testing connectivity to ${baseUrl}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(`${baseUrl}/health`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok || response.status === 404) {
          console.log(`Found working URL: ${baseUrl}`);
          
          // Cache this URL for future use
          await AsyncStorage.setItem('workingApiUrl', baseUrl);
          
          return baseUrl;
        }
      } catch (error) {
        console.log(`URL ${baseUrl} failed:`, error.message);
      }
    }
    
    console.log('No working URL found');
    return null;
  };
  
  // Create a multi-strategy upload function that tries different approaches
  const tryMultipleUploadStrategies = async (url, photoUris, authToken) => {
    console.log(`Trying multiple upload strategies for ${photoUris.length} photos to ${url}`);
    
    const strategies = [
      {
        name: "Standard FormData (file://)",
        fn: async () => {
          const formData = new FormData();
          
          photoUris.forEach((uri, index) => {
            const filename = uri.split('/').pop();
            const extension = filename.split('.').pop().toLowerCase() || 'jpg';
            const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
            
            // Standard approach with file://
            formData.append('photos', {
              uri: uri, // Keep original URI
              name: filename,
              type: mimeType
            });
          });
          
          return await fetch(url, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: formData
          });
        }
      },
      {
        name: "Modified FormData (no file://)",
        fn: async () => {
          const formData = new FormData();
          
          photoUris.forEach((uri, index) => {
            const filename = uri.split('/').pop();
            const extension = filename.split('.').pop().toLowerCase() || 'jpg';
            const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
            
            // Remove file:// prefix on iOS
            formData.append('photos', {
              uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
              name: filename,
              type: mimeType
            });
          });
          
          return await fetch(url, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: formData
          });
        }
      },
      {
        name: "Individual fields approach",
        fn: async () => {
          const formData = new FormData();
          
          photoUris.forEach((uri, index) => {
            const filename = uri.split('/').pop();
            const extension = filename.split('.').pop().toLowerCase() || 'jpg';
            const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
            
            // Use separate field names for each photo
            formData.append(`photo${index}`, {
              uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
              name: filename,
              type: mimeType
            });
          });
          
          return await fetch(url, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: formData
          });
        }
      },
      {
        name: "XMLHttpRequest approach",
        fn: async () => {
          return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url);
            xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
            xhr.setRequestHeader('Accept', 'application/json');
            
            xhr.onload = function() {
              resolve({
                status: xhr.status,
                statusText: xhr.statusText,
                text: () => Promise.resolve(xhr.responseText)
              });
            };
            
            xhr.onerror = function() {
              reject(new Error('XMLHttpRequest failed'));
            };
            
            const formData = new FormData();
            photoUris.forEach((uri, index) => {
              const filename = uri.split('/').pop();
              const extension = filename.split('.').pop().toLowerCase() || 'jpg';
              const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
              
              formData.append('photos', {
                uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
                name: filename,
                type: mimeType
              });
            });
            
            xhr.send(formData);
          });
        }
      }
    ];
    
    // Try each strategy in sequence
    const results = [];
    
    for (const strategy of strategies) {
      try {
        console.log(`Trying upload strategy: ${strategy.name}`);
        
        const response = await strategy.fn();
        const responseText = await response.text();
        const success = response.status >= 200 && response.status < 300;
        
        console.log(`Strategy ${strategy.name} result: status=${response.status}, success=${success}`);
        console.log(`Response: ${responseText}`);
        
        results.push({
          name: strategy.name,
          status: response.status,
          success,
          response: responseText
        });
        
        if (success) {
          console.log(`Strategy ${strategy.name} worked!`);
          return {
            success: true,
            strategy: strategy.name,
            response: responseText,
            results
          };
        }
      } catch (error) {
        console.error(`Strategy ${strategy.name} failed:`, error);
        results.push({
          name: strategy.name,
          error: error.message
        });
      }
    }
    
    return {
      success: false,
      results
    };
  };

  // Update uploadDirectToUrl to use the multi-strategy approach
  const uploadDirectToUrl = async (url, photoUris, authToken) => {
    if (!photoUris || photoUris.length === 0) {
      return;
    }
    
    console.log(`Uploading ${photoUris.length} photos directly to: ${url}`);
    
    try {
      // First try a standard approach
      const formData = new FormData();
      
      // Append each photo to the FormData - iOS needs special handling
      photoUris.forEach((uri, index) => {
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const extension = match ? match[1].toLowerCase() : 'jpg';
        const type = extension === 'png' ? 'image/png' : 
                    extension === 'gif' ? 'image/gif' : 'image/jpeg';
        
        console.log(`Adding photo ${index + 1}/${photoUris.length}: ${filename} (${type})`);
        
        // On iOS, formData requires this exact structure for multer to parse correctly
        formData.append('photos', {
          uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
          name: filename,
          type
        });
      });
      
      // Send the request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });
      
      console.log(`Upload response status: ${response.status}`);
      
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      // If we get "Unexpected end of form" error, try the multi-strategy approach
      if (response.status === 400 && responseText.includes('Unexpected end of form')) {
        console.log('Got "Unexpected end of form" error, trying multiple strategies...');
        
        const multiResult = await tryMultipleUploadStrategies(url, photoUris, authToken);
        
        if (multiResult.success) {
          console.log(`Multi-strategy upload succeeded using: ${multiResult.strategy}`);
          Alert.alert(
            'Upload Successful',
            `Found a working upload method: ${multiResult.strategy}. Photos have been uploaded.`,
            [{ text: 'OK' }]
          );
          
          try {
            return JSON.parse(multiResult.response);
          } catch (e) {
            return { success: true, message: 'Photos uploaded successfully' };
          }
        } else {
          console.error('All upload strategies failed');
          const failureDetails = multiResult.results.map(r => 
            `${r.name}: ${r.status || r.error || 'Failed'}`
          ).join('\n');
          
          Alert.alert(
            'Upload Error',
            `All upload strategies failed:\n${failureDetails}`,
            [{ text: 'OK' }]
          );
          
          throw new Error('All photo upload strategies failed');
        }
      }
      
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}: ${responseText}`);
      }
      
      // Try to parse JSON if possible
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.log('Response was not JSON:', responseText);
        result = { success: true, message: 'Photos uploaded' };
      }
      
      console.log('Photos uploaded successfully:', result);
      return result;
    } catch (error) {
      console.error('Error in uploadDirectToUrl:', error);
      throw error;
    }
  };

  // Function to test photo upload connectivity 
  const testPhotoUpload = async () => {
    if (photos.length === 0) {
      Alert.alert('No Photos', 'Please add at least one photo to test upload.');
      return;
    }
    
    try {
      setUploadingPhotos(true);
      const authToken = await AsyncStorage.getItem('authToken');
      
      if (!authToken) {
        Alert.alert('Authentication Error', 'No auth token found. Please log in again.');
        return;
      }
      
      // Create a simple FormData for diagnostic purposes
      const formData = new FormData();
      
      // Get the first photo for testing
      const uri = photos[0];
      const filename = uri.split('/').pop();
      const extension = filename.split('.').pop().toLowerCase() || 'jpg';
      const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
      
      // Get the file size if possible
      let fileSize = 'unknown';
      try {
        const fileInfo = await fetch(uri).then(r => {
          fileSize = r.headers.get('Content-Length') || 'unknown';
          return r;
        });
        console.log(`File info: size=${fileSize}, type=${fileInfo.headers.get('Content-Type')}`);
      } catch (e) {
        console.log('Could not get file info:', e.message);
      }
      
      // Detailed logging of the file
      console.log('Test photo details:', {
        uri,
        filename,
        extension,
        mimeType,
        fileSize,
        platform: Platform.OS,
        platformVersion: Platform.Version
      });
      
      // Log the FormData
      formData.append('testPhoto', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type: mimeType
      });
      
      // Add a text field to ensure the form is being properly constructed
      formData.append('text', 'This is a test form submission');
      
      // Try different URLs in sequence with detailed logging
      const urls = [
        'http://localhost:5008/api/test-upload',
        'http://10.0.2.2:5008/api/test-upload',
        'http://127.0.0.1:5008/api/test-upload',
        'http://192.168.1.2:5008/api/test-upload',
        'http://192.168.0.102:5008/api/test-upload'
      ];
      
      const testResults = [];
      let successfulUrl = null;
      
      for (const url of urls) {
        try {
          console.log(`Testing direct upload to ${url}...`);
          
          // Test HTTP headers first to see if the server is accessible
          const headerCheck = await fetch(url.replace('/test-upload', '/health'), {
            method: 'HEAD',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${authToken}`
            }
          }).catch(e => ({ error: e.message }));
          
          if (headerCheck.error) {
            testResults.push(`${url} - Server not reachable: ${headerCheck.error}`);
            continue;
          }
          
          console.log(`Server ${url} is reachable, status: ${headerCheck.status}`);
          testResults.push(`${url} - Server reachable: ${headerCheck.status}`);
          
          // Now try the actual form upload
          console.log(`Sending form data to ${url}...`);
          
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: formData
          });
          
          const responseText = await response.text();
          console.log(`Response from ${url}: status=${response.status}, body=${responseText}`);
          
          if (response.ok) {
            successfulUrl = url;
            testResults.push(`✅ ${url} - Success! Response: ${responseText}`);
            break; // Exit once we find a working URL
          } else {
            testResults.push(`❌ ${url} - Failed: ${response.status} - ${responseText}`);
            
            // Additional diagnostic for "Unexpected end of form" error
            if (responseText.includes('Unexpected end of form')) {
              console.log('Detected "Unexpected end of form" error - this is likely a Multer configuration issue');
              testResults.push('⚠️ "Unexpected end of form" indicates a Multer parsing issue on the server');
            }
          }
        } catch (error) {
          console.error(`Error testing ${url}:`, error);
          testResults.push(`❌ ${url} - Error: ${error.message}`);
        }
      }
      
      // Now try a raw XMLHttpRequest approach which sometimes works better with FormData
      if (!successfulUrl && Platform.OS === 'ios') {
        try {
          console.log('Trying XMLHttpRequest approach as a fallback...');
          
          // Create a promise wrapper around XMLHttpRequest
          const xmlResult = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const testUrl = urls[0]; // Try first URL
            
            xhr.open('POST', testUrl);
            xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
            xhr.setRequestHeader('Accept', 'application/json');
            
            xhr.onload = function() {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve({
                  status: xhr.status,
                  response: xhr.responseText
                });
              } else {
                reject({
                  status: xhr.status,
                  response: xhr.responseText
                });
              }
            };
            
            xhr.onerror = function() {
              reject({
                status: 0,
                response: 'Network error'
              });
            };
            
            // Create a new form with XMLHttpRequest approach
            const xhrFormData = new FormData();
            xhrFormData.append('testPhoto', {
              uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
              name: filename,
              type: mimeType
            });
            xhrFormData.append('text', 'XMLHttpRequest test');
            
            xhr.send(xhrFormData);
          });
          
          if (xmlResult) {
            testResults.push(`XMLHttpRequest approach: ${xmlResult.status} - ${xmlResult.response}`);
          }
        } catch (xhrError) {
          testResults.push(`XMLHttpRequest approach failed: ${xhrError.status} - ${xhrError.response}`);
        }
      }
      
      // Device info
      const deviceInfo = [
        `Platform: ${Platform.OS} ${Platform.Version}`,
        `Device: ${Platform.OS === 'ios' ? 'iOS Device' : 'Android Device'}`,
        `Photo URI format: ${uri.startsWith('file://') ? 'file://' : uri.substring(0, 10) + '...'}`,
        `Photo type: ${mimeType}`,
        `Photo size: ${fileSize} bytes`
      ];
      
      // Display comprehensive results
      Alert.alert(
        'Photo Upload Diagnostics',
        'Device Info:\n' + deviceInfo.join('\n') + 
        '\n\nResults:\n' + testResults.join('\n') +
        '\n\nCheck the logs for more details and server errors.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Test upload error:', error);
      Alert.alert('Test Failed', `Error: ${error.message}`);
    } finally {
      setUploadingPhotos(false);
    }
  };

  // Test server multer compatibility
  const testServerMulterCompatibility = async () => {
    try {
      setUploadingPhotos(true);
      const authToken = await AsyncStorage.getItem('authToken');
      
      if (!authToken) {
        Alert.alert('Authentication Error', 'No auth token found. Please log in again.');
        return;
      }
      
      // Get working URL
      const baseUrl = await findBestWorkingUrl(authToken);
      if (!baseUrl) {
        Alert.alert('Connection Error', 'Could not find a working server URL. Please check your connection and server status.');
        return;
      }
      
      // Select only one photo for testing
      if (photos.length === 0) {
        Alert.alert('No Photos', 'Please select at least one photo to test the server compatibility.');
        return;
      }
      
      const uri = photos[0];
      const filename = uri.split('/').pop();
      const testUrl = `${baseUrl}/test-multer-compatibility`;
      
      console.log(`Testing server multer compatibility at ${testUrl}...`);
      console.log(`Using photo: ${filename}`);
      
      // Create a very simple form data with just one field to test basic multer functionality
      const simpleFormData = new FormData();
      simpleFormData.append('testField', 'This is a text field test');
      
      // Test 1: Simple field (no file)
      try {
        const simpleResponse = await fetch(testUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: simpleFormData
        });
        
        console.log(`Test 1 (Simple field) status: ${simpleResponse.status}`);
        console.log('Test 1 response:', await simpleResponse.text());
      } catch (e) {
        console.error('Test 1 failed:', e);
      }
      
      // Test 2: Single file + text field
      const fileFormData = new FormData();
      fileFormData.append('testField', 'Text field with file');
      fileFormData.append('testFile', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: filename,
        type: 'image/jpeg'
      });
      
      try {
        const fileResponse = await fetch(testUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: fileFormData
        });
        
        console.log(`Test 2 (File + field) status: ${fileResponse.status}`);
        console.log('Test 2 response:', await fileResponse.text());
      } catch (e) {
        console.error('Test 2 failed:', e);
      }
      
      // Test 3: Contact server developer for multer configuration
      const results = await tryMultipleUploadStrategies(testUrl, [uri], authToken);
      
      // Display the test results
      const testReport = [
        'SERVER MULTER COMPATIBILITY REPORT',
        '================================',
        `Server URL: ${baseUrl}`,
        `Device: ${Platform.OS} ${Platform.Version}`,
        `Photo: ${filename}`,
        '',
        'Test Results:',
        results.success ? 
          `✅ COMPATIBLE using "${results.strategy}" method` : 
          '❌ INCOMPATIBLE - Your server needs Multer configuration updates',
        '',
        'Technical Details:',
        ...results.results.map(r => `${r.name}: ${r.success ? '✅' : '❌'} (${r.status || r.error || 'no details'})`),
        '',
        'RECOMMENDATION:',
        results.success ? 
          `Use the "${results.strategy}" method for uploads with this server.` :
          'The server needs to be updated to properly handle multipart/form-data uploads from React Native. Specifically, the multer middleware needs configuration to handle mobile app uploads.'
      ];
      
      console.log(testReport.join('\n'));
      
      Alert.alert(
        'Server Compatibility Report',
        testReport.join('\n'),
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Error testing server compatibility:', error);
      Alert.alert('Test Error', `Failed to test server compatibility: ${error.message}`);
    } finally {
      setUploadingPhotos(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Vehicle Details</Text>
          {__DEV__ && (
            <TouchableOpacity onPress={testApiUrls}>
              <IconButton icon="wifi" size={24} />
            </TouchableOpacity>
          )}
        </View>
        <Divider style={styles.divider} />
        
        <TextInput
          label="Vehicle Make *"
          value={vehicleData.make}
          onChangeText={(text) => updateVehicleData('make', text)}
          style={styles.input}
          error={!!errors.make}
          mode="outlined"
          placeholder="e.g. Toyota, Honda, BMW"
        />
        {errors.make && <Text style={styles.errorText}>{errors.make}</Text>}
        
        <TextInput
          label="Vehicle Model *"
          value={vehicleData.model}
          onChangeText={(text) => updateVehicleData('model', text)}
          style={styles.input}
          error={!!errors.model}
          mode="outlined"
        />
        {errors.model && <Text style={styles.errorText}>{errors.model}</Text>}
        
        <TextInput
          label="Year *"
          value={vehicleData.year}
          onChangeText={(text) => updateVehicleData('year', text)}
          style={styles.input}
          error={!!errors.year}
          keyboardType="numeric"
          maxLength={4}
          mode="outlined"
        />
        {errors.year && <Text style={styles.errorText}>{errors.year}</Text>}
        
        <TextInput
          label="Registration Number *"
          value={vehicleData.registrationNumber}
          onChangeText={(text) => updateVehicleData('registrationNumber', text)}
          style={styles.input}
          error={!!errors.registrationNumber}
          mode="outlined"
        />
        {errors.registrationNumber && <Text style={styles.errorText}>{errors.registrationNumber}</Text>}
        
        <TextInput
          label="Vehicle Type *"
          value={vehicleData.type}
          onChangeText={(text) => updateVehicleData('type', text)}
          style={styles.input}
          error={!!errors.type}
          placeholder="car, van, suv, bus, motorcycle, tuk-tuk, bicycle, other"
          mode="outlined"
        />
        {errors.type && <Text style={styles.errorText}>{errors.type}</Text>}
        {!errors.type && (
          <Caption style={styles.helperText}>
            Allowed types: car, van, suv, bus, motorcycle, tuk-tuk, bicycle, other
          </Caption>
        )}
        
        <TextInput
          label="Passenger Capacity *"
          value={vehicleData.capacity}
          onChangeText={(text) => updateVehicleData('capacity', text)}
          style={styles.input}
          error={!!errors.capacity}
          keyboardType="numeric"
          mode="outlined"
        />
        {errors.capacity && <Text style={styles.errorText}>{errors.capacity}</Text>}
        
        {/* Photo Upload Section */}
        <View style={styles.photoSection}>
          <Title style={styles.photoTitle}>Vehicle Photos (Optional)</Title>
          <Caption>You can add up to 5 photos of your vehicle</Caption>
          
          <Button
            mode="outlined"
            onPress={pickImages}
            style={styles.photoButton}
            icon="camera"
            disabled={photos.length >= 5 || loading}
          >
            {photos.length === 0 ? 'Add Photos' : 'Add More Photos'}
          </Button>
          
          {/* Display selected photos */}
          {photos.length > 0 && (
            <View style={styles.photoGrid}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri: photo }} style={styles.photo} />
                  <IconButton
                    icon="close-circle"
                    size={24}
                    style={styles.removePhoto}
                    onPress={() => removePhoto(index)}
                    color={COLORS.error}
                  />
                </View>
              ))}
            </View>
          )}
          
          {/* Upload status indicators */}
          {uploadingPhotos && (
            <View style={styles.statusContainer}>
              <Text style={styles.statusText}>Uploading photos, please wait...</Text>
            </View>
          )}
        </View>
        
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.submitButton}
          loading={loading || uploadingPhotos}
          disabled={loading || uploadingPhotos}
        >
          {loading || uploadingPhotos ? 'Adding Vehicle...' : 'Add Vehicle'}
        </Button>
        
        {/* Development tools */}
        {__DEV__ && (
          <View style={styles.devTools}>
            <Text style={styles.devHeader}>Development Tools</Text>
            <View style={styles.devButtonsRow}>
              {photos.length > 0 && (
                <Button
                  mode="outlined"
                  onPress={testPhotoUpload}
                  style={styles.devButton}
                  loading={uploadingPhotos}
                  disabled={uploadingPhotos}
                >
                  Test Upload
                </Button>
              )}
              
              <Button
                mode="outlined"
                onPress={testServerMulterCompatibility}
                style={styles.devButton}
                loading={uploadingPhotos}
                disabled={uploadingPhotos || photos.length === 0}
              >
                Test Server Compatibility
              </Button>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  formContainer: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.sm,
    backgroundColor: COLORS.white,
  },
  errorText: {
    color: COLORS.error || 'red',
    fontSize: 12,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: COLORS.primary,
  },
  photoSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray || '#e0e0e0',
  },
  photoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  photoButton: {
    marginVertical: spacing.md,
    borderColor: COLORS.primary,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  photoContainer: {
    width: '33.33%',
    padding: spacing.xs,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: 100,
    borderRadius: 4,
  },
  removePhoto: {
    position: 'absolute',
    top: 0,
    right: 0,
    margin: 0,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  testButton: {
    marginTop: spacing.md,
    borderColor: COLORS.secondary,
  },
  statusContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
  },
  statusText: {
    textAlign: 'center',
    color: COLORS.text,
  },
  helperText: {
    color: COLORS.secondaryText || '#666',
    fontSize: 12,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  devTools: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.03)'
  },
  devHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
    color: COLORS.text
  },
  devButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  devButton: {
    flex: 1,
    marginHorizontal: spacing.xs
  }
});

export default AddVehicleScreen; 