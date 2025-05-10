import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Headline,
  Text,
  HelperText,
  Switch,
  ActivityIndicator,
  IconButton,
  Snackbar,
} from 'react-native-paper';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { format } from 'date-fns';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL, API_URL_OPTIONS } from '../../constants/api';

// Import components and utilities
import Header from '../../components/common/Header';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { createItinerary } from '../../store/slices/itinerariesSlice';
import authService from '../../services/authService';
import AuthCheck from '../../components/common/AuthCheck';

const CreateItineraryScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.itineraries);
  const [serverStatus, setServerStatus] = useState(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [coverImage, setCoverImage] = useState(null);
  const [isPublic, setIsPublic] = useState(false);

  // Date picker visibility
  const [startDatePickerVisible, setStartDatePickerVisible] = useState(false);
  const [endDatePickerVisible, setEndDatePickerVisible] = useState(false);

  // Form validation
  const [errors, setErrors] = useState({});
  
  // Snackbar state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Test server connectivity on mount
  useEffect(() => {
    testServerConnection();
    // Also check authentication status
    checkUserAuth().then(userId => {
      if (userId) {
        console.log('User authenticated with ID:', userId);
      } else {
        console.warn('User authentication check failed or no user ID found');
      }
    });
  }, []);

  // Function to test server connectivity
  const testServerConnection = async () => {
    try {
      setServerStatus('checking');
      console.log('Testing server connectivity...');
      console.log('API URL:', API_URL);
      
      // Try the main API URL first
      try {
        const response = await axios.get(`${API_URL}/health`, { timeout: 5000 });
        setServerStatus('connected');
        console.log('Server is reachable:', response.data);
        return;
      } catch (mainError) {
        console.log('Main API URL failed:', mainError.message);
        
        // Try alternative URLs in development
        if (__DEV__) {
          for (const url of API_URL_OPTIONS) {
            try {
              console.log('Trying alternative URL:', url);
              const altResponse = await axios.get(`${url}/health`, { timeout: 3000 });
              setServerStatus('connected-alt');
              console.log('Alternative server is reachable:', altResponse.data);
              
              // Save the working URL for future use
              await AsyncStorage.setItem('workingApiUrl', url);
              return;
            } catch (altError) {
              console.log(`Alternative URL ${url} failed:`, altError.message);
            }
          }
        }
      }
      
      // If we get here, all attempts failed
      setServerStatus('disconnected');
      console.log('All server connection attempts failed');
    } catch (error) {
      setServerStatus('error');
      console.error('Error testing server connection:', error);
    }
  };

  // Handle date selection
  const handleStartDateConfirm = (date) => {
    setStartDatePickerVisible(false);
    setStartDate(date);
    // If end date is before start date or not set, update it
    if (!endDate || endDate < date) {
      setEndDate(date);
    }
  };

  const handleEndDateConfirm = (date) => {
    setEndDatePickerVisible(false);
    setEndDate(date);
  };

  // Handle image picking
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to select a cover image.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setCoverImage(result.assets[0].uri);
    }
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!endDate) {
      newErrors.endDate = 'End date is required';
    } else if (endDate < startDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (budget && isNaN(parseFloat(budget))) {
      newErrors.budget = 'Budget must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleCreateItinerary = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      console.log('============ ITINERARY CREATION DEBUG ============');
      
      // Get user ID using our AuthService
      const userId = await authService.getCurrentUserId(true);  // Force refresh from server
      
      if (!userId) {
        console.log('User ID not found - aborting itinerary creation');
        Alert.alert(
          'Authentication Required',
          'Please log in again to create an itinerary.',
          [{ 
            text: 'Go to Login', 
            onPress: () => navigation.navigate('Login')
          }]
        );
        return;
      }
      
      console.log('Creating itinerary with user ID:', userId);
      
      // Format the itinerary data
    const itineraryData = {
        id: Date.now().toString(), // Local ID
      title,
      description,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
      budget: budget ? parseFloat(budget) : 0,
      currency,
      isPublic,
        createdAt: new Date().toISOString(),
        coverImage: coverImage || null,
        places: [],
        touristId: userId, // Use the verified user ID
      };

      console.log('Creating itinerary with data:', JSON.stringify(itineraryData));
      
      // If server is disconnected, go straight to local storage
      if (serverStatus === 'disconnected' || serverStatus === 'error') {
        console.log('Server is disconnected, saving locally only...');
        await saveLocalItinerary(itineraryData);
        
        // Check for pending place and add it to the itinerary if exists
        const pendingPlaceJson = await AsyncStorage.getItem('pendingPlace');
        if (pendingPlaceJson) {
          try {
            const pendingPlace = JSON.parse(pendingPlaceJson);
            
            // Get saved itineraries
            const savedItinerariesJSON = await AsyncStorage.getItem('localItineraries');
            const savedItineraries = savedItinerariesJSON ? JSON.parse(savedItinerariesJSON) : [];
            
            // Find the newly created itinerary
            const newItineraryIndex = savedItineraries.findIndex(i => i.id === itineraryData.id);
            
            if (newItineraryIndex !== -1) {
              // Add the pending place to the itinerary
              if (!savedItineraries[newItineraryIndex].places) {
                savedItineraries[newItineraryIndex].places = [];
              }
              savedItineraries[newItineraryIndex].places.push(pendingPlace);
              
              // Save updated itineraries
              await AsyncStorage.setItem('localItineraries', JSON.stringify(savedItineraries));
              
              // Clear the pending place
              await AsyncStorage.removeItem('pendingPlace');
              
              // Show success message
              setSnackbarVisible(true);
              setSnackbarMessage(`Itinerary created with "${pendingPlace.name}" added!`);
            }
          } catch (error) {
            console.error('Error adding pending place to new itinerary:', error);
          }
        }
        
        navigation.goBack();
        return;
      }

      // Try to send directly to the server first
      try {
        console.log('Attempting direct server communication test...');
        // First try a simple GET to check connectivity
        const healthCheck = await axios.get(`${API_URL}/health`);
        console.log('Health check response:', healthCheck.data);
        
        const authToken = await AsyncStorage.getItem('authToken');
        if (!authToken) {
          throw new Error('Authentication token is missing');
        }
        
        // Try a JSON approach for sending the data
        const jsonData = {...itineraryData};
        if (jsonData.coverImage) {
          delete jsonData.coverImage;
        }
        
        // Send as JSON 
        const jsonResponse = await axios.post(`${API_URL}/itineraries`, jsonData, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
        });
        
        console.log('Itinerary created successfully on server:', jsonResponse.data);
      
        // Also save locally
        await saveLocalItinerary(jsonResponse.data.data.itinerary);
        
        // Check for pending place and add it to the itinerary if exists
        const pendingPlaceJson = await AsyncStorage.getItem('pendingPlace');
        if (pendingPlaceJson) {
          try {
            const pendingPlace = JSON.parse(pendingPlaceJson);
            
            // Get saved itineraries
            const savedItinerariesJSON = await AsyncStorage.getItem('localItineraries');
            const savedItineraries = savedItinerariesJSON ? JSON.parse(savedItinerariesJSON) : [];
            
            // Find the newly created itinerary
            const newItineraryIndex = savedItineraries.findIndex(i => 
              i.id === (jsonResponse.data.data.itinerary.id || itineraryData.id));
            
            if (newItineraryIndex !== -1) {
              // Add the pending place to the itinerary
              if (!savedItineraries[newItineraryIndex].places) {
                savedItineraries[newItineraryIndex].places = [];
              }
              savedItineraries[newItineraryIndex].places.push(pendingPlace);
              
              // Save updated itineraries
              await AsyncStorage.setItem('localItineraries', JSON.stringify(savedItineraries));
              
              // Clear the pending place
              await AsyncStorage.removeItem('pendingPlace');
              
              // Show success message
              setSnackbarVisible(true);
              setSnackbarMessage(`Itinerary created with "${pendingPlace.name}" added!`);
            }
          } catch (error) {
            console.error('Error adding pending place to new itinerary:', error);
          }
        }
        
        // Navigate back
        navigation.goBack();
      } catch (apiError) {
        console.error('API error details:', JSON.stringify({
          message: apiError.message,
          status: apiError.response?.status,
          data: apiError.response?.data,
        }));
        
        // If the API call fails, save locally as a fallback
        console.log('Server request failed, saving locally as fallback');
        await saveLocalItinerary(itineraryData);
        
        // Check for pending place (same as above, but for local fallback)
        const pendingPlaceJson = await AsyncStorage.getItem('pendingPlace');
        if (pendingPlaceJson) {
          try {
            const pendingPlace = JSON.parse(pendingPlaceJson);
            
            // Get saved itineraries
            const savedItinerariesJSON = await AsyncStorage.getItem('localItineraries');
            const savedItineraries = savedItinerariesJSON ? JSON.parse(savedItinerariesJSON) : [];
            
            // Find the newly created itinerary
            const newItineraryIndex = savedItineraries.findIndex(i => i.id === itineraryData.id);
            
            if (newItineraryIndex !== -1) {
              // Add the pending place to the itinerary
              if (!savedItineraries[newItineraryIndex].places) {
                savedItineraries[newItineraryIndex].places = [];
              }
              savedItineraries[newItineraryIndex].places.push(pendingPlace);
              
              // Save updated itineraries
              await AsyncStorage.setItem('localItineraries', JSON.stringify(savedItineraries));
              
              // Clear the pending place
              await AsyncStorage.removeItem('pendingPlace');
              
              // Show success message
              setSnackbarVisible(true);
              setSnackbarMessage(`Itinerary created with place "${pendingPlace.name}" added!`);
            }
          } catch (error) {
            console.error('Error adding pending place to new itinerary:', error);
          }
        }
        
        setSnackbarVisible(true);
        setSnackbarMessage('Created locally. Server sync failed: ' + 
          (apiError.message || 'Unknown error'));
        
        // Still navigate back after local save
        setTimeout(() => navigation.goBack(), 2000);
      }
    } catch (error) {
      console.error('Create itinerary error:', error);
      setSnackbarVisible(true);
      setSnackbarMessage('Error creating itinerary: ' + (error.message || 'Unknown error'));
    } finally {
      console.log('============ END ITINERARY CREATION DEBUG ============');
    }
  };
  
  // Helper function to save itinerary locally
  const saveLocalItinerary = async (itineraryData) => {
    console.log('Falling back to local storage...');
    const savedItinerariesJSON = await AsyncStorage.getItem('localItineraries');
    const savedItineraries = savedItinerariesJSON ? JSON.parse(savedItinerariesJSON) : [];
    
    // Add new itinerary to the list
    savedItineraries.push(itineraryData);
    
    // Save updated list back to AsyncStorage
    await AsyncStorage.setItem('localItineraries', JSON.stringify(savedItineraries));
    
    // Show success message
    setSnackbarVisible(true);
    setSnackbarMessage('Server unavailable: Itinerary saved locally.');
    
    // Navigate back or to the itineraries list after a delay
    setTimeout(() => {
      navigation.goBack();
    }, 3000);
  };

  // Function to run detailed server diagnostics
  const runServerDiagnostics = async () => {
    try {
      setLoading(true);
      console.log('--- SERVER DIAGNOSTICS STARTED ---');
      
      // Check health endpoint
      console.log('Testing /health endpoint...');
      try {
        const healthResponse = await axios.get(`${API_URL}/health`, { timeout: 5000 });
        console.log('Health endpoint response:', healthResponse.data);
      } catch (error) {
        console.error('Health endpoint error:', error.message);
      }
      
      // Check authentication status
      console.log('Checking authentication status...');
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        console.log('Auth token found in storage');
        try {
          const meResponse = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000
          });
          console.log('Auth check successful:', meResponse.data);
        } catch (error) {
          console.error('Auth check failed:', error.message);
        }
      } else {
        console.log('No auth token found - user may not be logged in');
      }
      
      // Test itineraries list endpoint
      console.log('Testing itineraries list endpoint...');
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const itinerariesResponse = await axios.get(`${API_URL}/itineraries`, {
          headers,
          timeout: 5000
        });
        console.log('Itineraries endpoint response:', itinerariesResponse.data);
      } catch (error) {
        console.error('Itineraries endpoint error:', error.message);
      }
      
      // Get MongoDB connection info from server
      console.log('Testing database connection status...');
      try {
        const dbStatusResponse = await axios.get(`${API_URL}/system/db-status`, { timeout: 5000 });
        console.log('Database status:', dbStatusResponse.data);
      } catch (error) {
        console.error('Database status check failed:', error.message);
      }
      
      console.log('--- SERVER DIAGNOSTICS COMPLETED ---');
      
      // Show diagnostic results to user
      Alert.alert(
        'Server Diagnostics',
        'Diagnostics complete. Check console for detailed results.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error running diagnostics:', error);
    } finally {
      setLoading(false);
    }
  };
      
  // Function to check if MongoDB is running locally
  const checkLocalMongoDB = async () => {
    try {
      setLoading(true);
      console.log('Checking if MongoDB is running locally...');
      
      // Try to connect to common MongoDB ports
      const ports = [27017, 27018, 27019];
      
      for (const port of ports) {
        try {
          // We can't directly check MongoDB from the app, but we can try 
          // a basic connection to the port using a quick timeout
          console.log(`Checking port ${port}...`);
          
          const response = await fetch(`http://localhost:${port}`, { 
            method: 'GET',
            signal: AbortSignal.timeout(500)  // Very short timeout
          });
          
          console.log(`Port ${port} responded with status: ${response.status}`);
        } catch (error) {
          if (error.name === 'AbortError') {
            console.log(`Port ${port} check timed out, might be blocked`);
          } else if (error.message.includes('Network request failed')) {
            console.log(`Port ${port} appears to be closed or inaccessible`);
          } else {
            console.log(`Port ${port} check error: ${error.message}`);
          }
        }
      }
      
      // Try direct connection to MongoDB URI via server endpoint
      try {
        console.log('Requesting MongoDB connection check from server...');
        const response = await axios.get(`${API_URL}/system/check-mongodb`, { timeout: 5000 });
        console.log('MongoDB connection check result:', response.data);
        
        if (response.data.connected) {
          Alert.alert('MongoDB Status', 'MongoDB is running and connected to the server.');
        } else {
          Alert.alert('MongoDB Status', 'MongoDB appears to be down or not reachable by the server.');
        }
      } catch (error) {
        console.error('MongoDB connection check failed:', error.message);
        Alert.alert('MongoDB Status', 'Could not verify MongoDB status: ' + error.message);
      }
    } catch (error) {
      console.error('Error checking MongoDB:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to check user authentication status
  const checkUserAuth = async () => {
    try {
      // First check if user is authenticated with our service
      const isAuthenticated = await authService.isAuthenticated();
      if (!isAuthenticated) {
        Alert.alert(
          'Authentication Issue',
          'You are not logged in or your session has expired. Please log in again.',
          [{ 
            text: 'Go to Login', 
            onPress: () => navigation.navigate('Login')
          }]
        );
        return false;
      }
      
      // Get user ID with force refresh if server is connected
      const userId = await authService.getCurrentUserId(serverStatus === 'connected');
      if (!userId) {
        // If still no user ID after all attempts, show error
        Alert.alert(
          'Missing User ID',
          'Your user ID is missing. Please log out and log in again to fix this issue.',
          [
            { 
              text: 'Go to Login', 
              onPress: () => navigation.navigate('Login')
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
        return false;
      }
      
      return userId;
    } catch (error) {
      console.error('Error checking auth status:', error);
      return false;
    }
  };

  return (
    <AuthCheck redirectToLogin={true}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header 
        title="Create New Itinerary" 
        showBackButton 
        onBackPress={() => navigation.goBack()} 
      />
      
      <ScrollView style={styles.container}>
        <View style={styles.form}>
          <Headline style={styles.headline}>Plan Your Adventure</Headline>
          
          {/* Title Input */}
          <TextInput
            label="Itinerary Title *"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            error={!!errors.title}
            mode="outlined"
          />
          {errors.title && <HelperText type="error">{errors.title}</HelperText>}
          
          {/* Description Input */}
          <TextInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            style={styles.input}
            multiline
            numberOfLines={3}
            mode="outlined"
          />
          
          {/* Date Selection */}
          <View style={styles.dateContainer}>
            {/* Start Date */}
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>Start Date *</Text>
              <TouchableOpacity
                style={[
                  styles.datePicker, 
                  errors.startDate && styles.datePickerError
                ]}
                onPress={() => setStartDatePickerVisible(true)}
              >
                <Text style={startDate ? styles.dateText : styles.datePlaceholder}>
                  {startDate ? format(startDate, 'MMM d, yyyy') : 'Select date'}
                </Text>
                <MaterialCommunityIcons name="calendar" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              {errors.startDate && <HelperText type="error">{errors.startDate}</HelperText>}
            </View>
            
            {/* End Date */}
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>End Date *</Text>
              <TouchableOpacity
                style={[
                  styles.datePicker, 
                  errors.endDate && styles.datePickerError
                ]}
                onPress={() => setEndDatePickerVisible(true)}
              >
                <Text style={endDate ? styles.dateText : styles.datePlaceholder}>
                  {endDate ? format(endDate, 'MMM d, yyyy') : 'Select date'}
                </Text>
                <MaterialCommunityIcons name="calendar" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              {errors.endDate && <HelperText type="error">{errors.endDate}</HelperText>}
            </View>
          </View>
          
          {/* Budget Input */}
          <View style={styles.budgetContainer}>
            <View style={styles.budgetField}>
              <TextInput
                label="Budget (optional)"
                value={budget}
                onChangeText={setBudget}
                keyboardType="numeric"
                style={[styles.input, styles.budgetInput]}
                error={!!errors.budget}
                mode="outlined"
              />
              {errors.budget && <HelperText type="error">{errors.budget}</HelperText>}
            </View>
            
            <View style={styles.currencyField}>
              <TextInput
                label="Currency"
                value={currency}
                onChangeText={setCurrency}
                style={[styles.input, styles.currencyInput]}
                mode="outlined"
              />
            </View>
          </View>
          
          {/* Cover Image Selection */}
          <Text style={styles.sectionTitle}>Cover Image</Text>
          <TouchableOpacity style={styles.coverImagePicker} onPress={pickImage}>
            {coverImage ? (
              <Image
                source={{ uri: coverImage }}
                style={styles.coverImagePreview}
              />
            ) : (
              <View style={styles.coverImagePlaceholder}>
                <MaterialCommunityIcons name="image-plus" size={48} color={COLORS.primary} />
                <Text style={styles.coverImageText}>Add a cover image</Text>
              </View>
            )}
            
            {coverImage && (
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setCoverImage(null)}
              >
                <MaterialCommunityIcons name="close-circle" size={28} color={COLORS.white} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          
          {/* Privacy Setting */}
          <View style={styles.privacyContainer}>
            <View style={styles.privacyTextContainer}>
              <Text style={styles.privacyTitle}>Make itinerary public</Text>
              <Text style={styles.privacyDescription}>
                Public itineraries can be seen by other travelers
              </Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              color={COLORS.primary}
            />
          </View>
          
          {/* Create Button */}
          <Button
            mode="contained"
            onPress={handleCreateItinerary}
            style={styles.createButton}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              "Create Itinerary"
            )}
          </Button>
            
            {/* Server Status Indicator */}
            <View style={styles.serverStatusContainer}>
              <View style={styles.serverStatusHeader}>
                <Text style={styles.serverStatusLabel}>Server Status: </Text>
                <View style={styles.diagnosticButtonsRow}>
                  <TouchableOpacity onPress={runServerDiagnostics} style={styles.diagnosticButton}>
                    <Text style={styles.diagnosticText}>Run Diagnostics</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={checkLocalMongoDB} style={styles.diagnosticButton}>
                    <Text style={styles.diagnosticText}>Check MongoDB</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={checkUserAuth} style={styles.diagnosticButton}>
                    <Text style={styles.diagnosticText}>Check Auth</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {serverStatus === 'checking' && (
                <View style={styles.statusRow}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.checkingText}> Checking connection...</Text>
                </View>
              )}
              {serverStatus === 'connected' && (
                <View style={styles.statusRow}>
                  <MaterialCommunityIcons name="check-circle" size={18} color="green" />
                  <Text style={styles.connectedText}> Connected</Text>
                </View>
              )}
              {serverStatus === 'connected-alt' && (
                <View style={styles.statusRow}>
                  <MaterialCommunityIcons name="check-circle-outline" size={18} color="green" />
                  <Text style={styles.connectedAltText}> Connected (alternative server)</Text>
                </View>
              )}
              {serverStatus === 'disconnected' && (
                <View style={styles.statusRow}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.error} />
                  <Text style={styles.disconnectedText}> Not connected</Text>
                  <TouchableOpacity onPress={testServerConnection} style={styles.retryButton}>
                    <Text style={styles.retryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}
              {serverStatus === 'error' && (
                <View style={styles.statusRow}>
                  <MaterialCommunityIcons name="alert-circle" size={18} color="orange" />
                  <Text style={styles.errorText}> Connection error</Text>
                  <TouchableOpacity onPress={testServerConnection} style={styles.retryButton}>
                    <Text style={styles.retryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
            {/* Warning Message for Offline Mode */}
            {(serverStatus === 'disconnected' || serverStatus === 'error') && (
              <View style={styles.offlineWarning}>
                <MaterialCommunityIcons name="information" size={20} color={COLORS.warning} />
                <Text style={styles.offlineWarningText}>
                  Server connection unavailable. Your itinerary will be saved locally.
                </Text>
              </View>
            )}
        </View>
      </ScrollView>
      
      {/* Date Pickers */}
      <DateTimePickerModal
        isVisible={startDatePickerVisible}
        mode="date"
        onConfirm={handleStartDateConfirm}
        onCancel={() => setStartDatePickerVisible(false)}
        minimumDate={new Date()}
      />
      
      <DateTimePickerModal
        isVisible={endDatePickerVisible}
        mode="date"
        onConfirm={handleEndDateConfirm}
        onCancel={() => setEndDatePickerVisible(false)}
        minimumDate={startDate || new Date()}
      />
        
        {/* Snackbar for notifications */}
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
    </KeyboardAvoidingView>
    </AuthCheck>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  form: {
    padding: 16,
  },
  headline: {
    ...FONTS.h2,
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: COLORS.white,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateField: {
    width: '48%',
  },
  dateLabel: {
    ...FONTS.body4,
    marginBottom: 8,
  },
  datePicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 4,
    padding: 12,
    backgroundColor: COLORS.white,
  },
  datePickerError: {
    borderColor: COLORS.error,
  },
  dateText: {
    ...FONTS.body3,
  },
  datePlaceholder: {
    ...FONTS.body3,
    color: COLORS.gray,
  },
  budgetContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  budgetField: {
    flex: 2,
    marginRight: 8,
  },
  currencyField: {
    flex: 1,
  },
  budgetInput: {
    marginBottom: 0,
  },
  currencyInput: {
    marginBottom: 0,
  },
  sectionTitle: {
    ...FONTS.h3,
    marginTop: 8,
    marginBottom: 16,
  },
  coverImagePicker: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  coverImagePreview: {
    width: '100%',
    height: '100%',
  },
  coverImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImageText: {
    ...FONTS.body3,
    color: COLORS.gray,
    marginTop: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 14,
    padding: 0,
  },
  privacyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyTitle: {
    ...FONTS.h4,
    marginBottom: 4,
  },
  privacyDescription: {
    ...FONTS.body4,
    color: COLORS.gray,
  },
  createButton: {
    height: 50,
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: COLORS.primary,
  },
  serverStatusContainer: {
    marginBottom: 24,
  },
  serverStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serverStatusLabel: {
    ...FONTS.body4,
    marginBottom: 8,
  },
  diagnosticButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  diagnosticButton: {
    marginLeft: 8,
  },
  diagnosticText: {
    ...FONTS.body4,
    color: COLORS.primary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkingText: {
    ...FONTS.body4,
    marginLeft: 8,
  },
  connectedText: {
    ...FONTS.body4,
    marginLeft: 8,
  },
  connectedAltText: {
    ...FONTS.body4,
    marginLeft: 8,
  },
  disconnectedText: {
    ...FONTS.body4,
    marginLeft: 8,
  },
  errorText: {
    ...FONTS.body4,
    marginLeft: 8,
  },
  retryButton: {
    marginLeft: 8,
  },
  retryText: {
    ...FONTS.body4,
    color: COLORS.primary,
  },
  offlineWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
  },
  offlineWarningText: {
    ...FONTS.body4,
    marginLeft: 8,
  },
});

export default CreateItineraryScreen;