import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  Alert,
  TouchableOpacity 
} from 'react-native';
import { 
  TextInput, 
  Button, 
  Text, 
  Snackbar, 
  HelperText, 
  Title, 
  Divider, 
  Chip
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile } from '../../store/slices/authSlice';
import { COLORS } from '../../constants/theme';
import api from '../../api/axios';
import { API_ENDPOINTS } from '../../constants/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import * as Yup from 'yup';
import { Formik } from 'formik';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Form validation schema
const profileSchema = Yup.object().shape({
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  phoneNumber: Yup.string().required('Phone number is required'),
  licenseNumber: Yup.string().required('License number is required'),
  experience: Yup.number()
    .typeError('Experience must be a number')
    .min(0, 'Experience cannot be negative')
    .required('Experience is required'),
  bio: Yup.string().max(500, 'Bio cannot exceed 500 characters'),
});

const EditProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [serviceAreas, setServiceAreas] = useState([]);
  const [newArea, setNewArea] = useState('');
  const isMounted = useRef(true);
  
  useEffect(() => {
    // Component cleanup
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Set initial service areas from user data
    if (user?.vehicleOwner?.serviceAreas && user.vehicleOwner.serviceAreas.length > 0) {
      setServiceAreas(user.vehicleOwner.serviceAreas);
    }
  }, [user?.vehicleOwner?.serviceAreas]);

  const addServiceArea = () => {
    if (newArea.trim() === '') return;
    
    // Don't add duplicates
    if (serviceAreas.includes(newArea.trim())) {
      setSnackbarMessage('This area is already added');
      setSnackbarVisible(true);
      return;
    }
    
    setServiceAreas([...serviceAreas, newArea.trim()]);
    setNewArea('');
  };
  
  const removeServiceArea = (area) => {
    setServiceAreas(serviceAreas.filter(a => a !== area));
  };

  const handleSubmit = async (values) => {
    try {
      // Check network connection
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        Alert.alert(
          'No Internet Connection',
          'Your profile cannot be updated while offline. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      setSaving(true);
      
      // Prepare data for the API call
      const vehicleOwnerData = {
        licenseNumber: values.licenseNumber,
        serviceAreas: serviceAreas,
        bio: values.bio || ''
        // Note: Experience is stored in the UI but not sent to server as it's not in the server model
      };
      
      const userData = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phoneNumber: values.phoneNumber,
      };
      
      // Save to server
      const response = await api.put(
        API_ENDPOINTS.VEHICLE_OWNERS.PROFILE,
        { 
          user: userData,
          vehicleOwner: vehicleOwnerData
        }
      );
      
      if (response.data.success) {
        // Update redux state
        dispatch(updateProfile({
          ...userData,
          vehicleOwner: vehicleOwnerData
        }));
        
        // Cache vehicle owner data for offline access (including experience field)
        const cachedVehicleOwnerData = {
          ...vehicleOwnerData,
          experience: values.experience // Store experience in the cache even though it's not in server model
        };
        await AsyncStorage.setItem('cachedVehicleOwnerData', JSON.stringify(cachedVehicleOwnerData));
        
        // Show success message
        setSnackbarMessage('Profile updated successfully');
        setSnackbarVisible(true);
        
        // Navigate back after a short delay
        setTimeout(() => {
          if (isMounted.current) {
            navigation.goBack();
          }
        }, 1500);
      } else {
        throw new Error(response.data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      
      let errorMessage = 'Failed to update profile. Please try again.';
      
      if (error.response) {
        // Server responded with an error
        const errorData = error.response.data;
        console.log('Server error response:', JSON.stringify(errorData));
        
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      if (isMounted.current) {
        setSnackbarMessage(errorMessage);
        setSnackbarVisible(true);
      }
    } finally {
      if (isMounted.current) {
        setSaving(false);
      }
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading profile..." />;
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>No profile data available</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  // Extract initial values from user object
  const initialValues = {
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    phoneNumber: user.phoneNumber || '',
    licenseNumber: user.vehicleOwner?.licenseNumber || '',
    experience: user.vehicleOwner?.experience?.toString() || '0',
    bio: user.vehicleOwner?.bio || '',
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={80}
    >
      <ScrollView style={styles.scrollContainer}>
        <Formik
          initialValues={initialValues}
          validationSchema={profileSchema}
          onSubmit={handleSubmit}
        >
          {({ 
            handleChange, 
            handleBlur, 
            handleSubmit, 
            values, 
            errors, 
            touched, 
            setFieldValue 
          }) => (
            <View style={styles.formContainer}>
              <Title style={styles.sectionTitle}>Personal Information</Title>
              
              <TextInput
                label="First Name"
                value={values.firstName}
                onChangeText={handleChange('firstName')}
                onBlur={handleBlur('firstName')}
                style={styles.textInput}
                mode="outlined"
                error={touched.firstName && errors.firstName}
              />
              {touched.firstName && errors.firstName && (
                <HelperText type="error">{errors.firstName}</HelperText>
              )}
              
              <TextInput
                label="Last Name"
                value={values.lastName}
                onChangeText={handleChange('lastName')}
                onBlur={handleBlur('lastName')}
                style={styles.textInput}
                mode="outlined"
                error={touched.lastName && errors.lastName}
              />
              {touched.lastName && errors.lastName && (
                <HelperText type="error">{errors.lastName}</HelperText>
              )}
              
              <TextInput
                label="Email"
                value={values.email}
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
                style={styles.textInput}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                error={touched.email && errors.email}
              />
              {touched.email && errors.email && (
                <HelperText type="error">{errors.email}</HelperText>
              )}
              
              <TextInput
                label="Phone Number"
                value={values.phoneNumber}
                onChangeText={handleChange('phoneNumber')}
                onBlur={handleBlur('phoneNumber')}
                style={styles.textInput}
                mode="outlined"
                keyboardType="phone-pad"
                error={touched.phoneNumber && errors.phoneNumber}
              />
              {touched.phoneNumber && errors.phoneNumber && (
                <HelperText type="error">{errors.phoneNumber}</HelperText>
              )}
              
              <Divider style={styles.divider} />
              
              <Title style={styles.sectionTitle}>Vehicle Owner Information</Title>
              
              <TextInput
                label="License Number"
                value={values.licenseNumber}
                onChangeText={handleChange('licenseNumber')}
                onBlur={handleBlur('licenseNumber')}
                style={styles.textInput}
                mode="outlined"
                error={touched.licenseNumber && errors.licenseNumber}
              />
              {touched.licenseNumber && errors.licenseNumber && (
                <HelperText type="error">{errors.licenseNumber}</HelperText>
              )}
              
              <TextInput
                label="Years of Experience"
                value={values.experience}
                onChangeText={handleChange('experience')}
                onBlur={handleBlur('experience')}
                style={styles.textInput}
                mode="outlined"
                keyboardType="numeric"
                error={touched.experience && errors.experience}
              />
              {touched.experience && errors.experience && (
                <HelperText type="error">{errors.experience}</HelperText>
              )}
              
              <TextInput
                label="Bio"
                value={values.bio}
                onChangeText={handleChange('bio')}
                onBlur={handleBlur('bio')}
                style={styles.textAreaInput}
                mode="outlined"
                multiline
                numberOfLines={4}
                error={touched.bio && errors.bio}
              />
              {touched.bio && errors.bio && (
                <HelperText type="error">{errors.bio}</HelperText>
              )}
              
              <Text style={styles.label}>Service Areas</Text>
              <View style={styles.areaInputContainer}>
                <TextInput
                  label="Add Service Area"
                  value={newArea}
                  onChangeText={setNewArea}
                  style={styles.areaInput}
                  mode="outlined"
                />
                <Button
                  mode="contained"
                  onPress={addServiceArea}
                  style={styles.addButton}
                  disabled={!newArea.trim()}
                >
                  Add
                </Button>
              </View>
              
              <View style={styles.chipContainer}>
                {serviceAreas.map((area, index) => (
                  <Chip
                    key={index}
                    style={styles.chip}
                    onClose={() => removeServiceArea(area)}
                  >
                    {area}
                  </Chip>
                ))}
              </View>
              
              <View style={styles.buttonContainer}>
                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  style={styles.submitButton}
                  loading={saving}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </Button>
                
                <Button
                  mode="outlined"
                  onPress={() => navigation.goBack()}
                  style={styles.cancelButton}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </View>
            </View>
          )}
        </Formik>
      </ScrollView>
      
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  formContainer: {
    padding: 16,
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
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: COLORS.primary,
    marginBottom: 16,
  },
  textInput: {
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  textAreaInput: {
    marginBottom: 16,
    backgroundColor: '#fafafa',
    height: 100,
  },
  divider: {
    marginVertical: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: COLORS.textDark,
  },
  areaInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  areaInput: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#fafafa',
  },
  addButton: {
    marginTop: 6, // Align with input
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  chip: {
    margin: 4,
  },
  buttonContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
  submitButton: {
    marginBottom: 12,
  },
  cancelButton: {
    borderColor: COLORS.error,
  },
});

export default EditProfileScreen; 