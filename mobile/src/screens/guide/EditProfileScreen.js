import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { TextInput, Button, Text, Chip, Divider, HelperText, Snackbar, Avatar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, spacing } from '../../constants/theme';
import api from '../../api/axios';
import { API_ENDPOINTS } from '../../constants/api';
import { updateProfile, uploadProfileImage } from '../../store/slices/authSlice';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImageUploader from '../../components/common/ImageUploader';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { updateGuideProfile } from '../../redux/actions/profileActions';

// List of guide specializations
const SPECIALIZATIONS = [
  'City Tours', 'Cultural Heritage', 'Historical Sites', 'Eco Tourism', 
  'Adventure Tours', 'Food Tours', 'Photography Tours', 'Wildlife Tours',
  'Hiking & Trekking', 'Religious Sites', 'Local Experience', 'Architecture',
  'Art & Museums', 'Beach Tours', 'Mountain Climbing', 'Bird Watching'
];

// Languages supported
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'si', name: 'Sinhala' },
  { code: 'ta', name: 'Tamil' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ru', name: 'Russian' }
];

// Validation schema
const ProfileSchema = Yup.object().shape({
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  phoneNumber: Yup.string()
    .matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/, 'Phone number is not valid')
    .required('Phone number is required'),
  preferredLanguage: Yup.string().oneOf(['en', 'si', 'ta']).required('Preferred language is required'),
  bio: Yup.string().max(500, 'Bio must be less than 500 characters').required('Bio is required'),
  rate: Yup.number()
    .typeError('Rate must be a number')
    .positive('Rate must be positive')
    .required('Rate is required'),
  yearsOfExperience: Yup.number()
    .typeError('Years of experience must be a number')
    .min(0, 'Years of experience cannot be negative')
    .required('Years of experience is required'),
  licenseNumber: Yup.string().required('License number is required'),
});

const EditProfileScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { user, isLoading } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [selectedSpecializations, setSelectedSpecializations] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [image, setImage] = useState(user?.avatar || null);
  
  // Initialize form state from Redux state
  const [bio, setBio] = useState(user?.guide?.bio || '');
  const [experience, setExperience] = useState(user?.guide?.experience ? user.guide.experience.toString() : '');
  const [location, setLocation] = useState('');
  const [locations, setLocations] = useState(user?.guide?.serviceAreas || []);
  const [language, setLanguage] = useState('');
  const [languages, setLanguages] = useState(user?.guide?.languages || []);
  const [expertise, setExpertise] = useState('');
  const [expertises, setExpertises] = useState(user?.guide?.expertise || []);
  const [hourlyRate, setHourlyRate] = useState(user?.guide?.rates?.hourly ? user.guide.rates.hourly.toString() : '');
  const [dailyRate, setDailyRate] = useState(user?.guide?.rates?.daily ? user.guide.rates.daily.toString() : '');

  useEffect(() => {
    // Initialize selected specializations from user data
    if (user?.guide?.specializations) {
      setSelectedSpecializations(user.guide.specializations);
    }
    
    // Initialize selected languages from user data
    if (user?.guide?.languages) {
      setSelectedLanguages(user.guide.languages);
    }
  }, [user]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Check network connection first
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new Error('No internet connection available. Please check your network settings.');
      }
      
      // Validate required fields
      if (!bio || bio.trim().length < 10) {
        Alert.alert('Validation Error', 'Please provide a bio with at least 10 characters');
        setSaving(false);
        return;
      }
      
      if (bio.trim().length > 500) {
        Alert.alert('Validation Error', 'Bio cannot exceed 500 characters');
        setSaving(false);
        return;
      }
      
      if (locations.length === 0) {
        Alert.alert('Validation Error', 'Please add at least one service area');
        setSaving(false);
        return;
      }

      if (languages.length === 0) {
        Alert.alert('Validation Error', 'Please add at least one language');
        setSaving(false);
        return;
      }

      if (expertises.length === 0) {
        Alert.alert('Validation Error', 'Please add at least one area of expertise');
        setSaving(false);
        return;
      }
      
      // Prepare data
      const profileData = {
        bio,
        experience: experience ? parseInt(experience, 10) : 0,
        serviceAreas: locations,
        languages,
        expertise: expertises,
        rates: {
          hourly: hourlyRate ? parseFloat(hourlyRate) : 0,
          daily: dailyRate ? parseFloat(dailyRate) : 0,
        }
      };
      
      // Save profile with timeout
      const response = await api.put(API_ENDPOINTS.GUIDES.PROFILE, profileData, {
        timeout: 15000 // 15 second timeout
      });
      
      if (response.data && response.data.status === 'success') {
        // Directly update Redux with the guide data from the server response
        if (response.data.data && response.data.data.guide) {
          dispatch(updateProfile({
            guide: response.data.data.guide
          }));
        } else {
          // Fallback to constructed guide object if response doesn't contain the full guide data
          dispatch(updateProfile({
            guide: {
              bio,
              experience: experience ? parseInt(experience, 10) : 0,
              serviceAreas: locations,
              languages,
              expertise: expertises,
              rates: {
                hourly: hourlyRate ? parseFloat(hourlyRate) : 0,
                daily: dailyRate ? parseFloat(dailyRate) : 0,
              }
            }
          }));
        }
        
        // Force reload user data to sync with server
        try {
          const userResponse = await api.get(API_ENDPOINTS.AUTH.ME);
          if (userResponse.data && userResponse.data.data && userResponse.data.data.user) {
            // Replace the entire user object instead of merging to ensure all fields are up to date
            dispatch(updateProfile(userResponse.data.data.user));
            
            // Cache the guide data in AsyncStorage for offline access
            try {
              await AsyncStorage.setItem('cachedGuideData', JSON.stringify(userResponse.data.data.user.guide));
            } catch (cacheError) {
              console.log('Failed to cache guide data:', cacheError);
            }
          }
        } catch (refreshError) {
          console.error('Error refreshing user data:', refreshError);
        }
        
        Alert.alert('Success', 'Your guide profile has been updated successfully');
        
        // Go back to profile screen
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error updating guide profile:', error);
      
      let errorMessage = 'Failed to update your guide profile.';
      
      if (error.message.includes('Network Error') || error.message.includes('internet connection')) {
        errorMessage = 'Network error: Please check your internet connection and server availability.';
      } else if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        if (status === 401) {
          errorMessage = 'Your session has expired. Please log in again.';
        } else if (status === 403) {
          errorMessage = 'You do not have permission to update this profile.';
        } else if (status >= 500) {
          errorMessage = 'Server error. Our team has been notified.';
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        // Request made but no response received (server down or unreachable)
        errorMessage = 'Could not connect to the server. Please try again later.';
      }
      
      setSnackbarMessage(errorMessage);
      setSnackbarVisible(true);
    } finally {
      setSaving(false);
    }
  };

  const addItem = (item, list, setList, field) => {
    if (!item || item.trim() === '') return;
    
    if (list.includes(item.trim())) {
      Alert.alert('Already Added', `This ${field} is already in your list`);
      return;
    }
    
    setList([...list, item.trim()]);
    
    // Clear input field
    switch (field) {
      case 'location':
        setLocation('');
        break;
      case 'language':
        setLanguage('');
        break;
      case 'expertise':
        setExpertise('');
        break;
      default:
        break;
    }
  };

  const removeItem = (item, list, setList) => {
    setList(list.filter(i => i !== item));
  };

  const handleSpecializationToggle = (specialization, formikSetFieldValue) => {
    let newSpecializations;
    if (selectedSpecializations.includes(specialization)) {
      newSpecializations = selectedSpecializations.filter(s => s !== specialization);
    } else {
      newSpecializations = [...selectedSpecializations, specialization];
    }
    setSelectedSpecializations(newSpecializations);
    formikSetFieldValue('specializations', newSpecializations);
  };

  const handleLanguageToggle = (languageCode, formikSetFieldValue) => {
    let newLanguages;
    if (selectedLanguages.includes(languageCode)) {
      newLanguages = selectedLanguages.filter(l => l !== languageCode);
    } else {
      newLanguages = [...selectedLanguages, languageCode];
    }
    setSelectedLanguages(newLanguages);
    formikSetFieldValue('languages', newLanguages);
  };

  const handleSaveProfile = async (values) => {
    try {
      // Prepare guide-specific data
      const guideData = {
        ...values,
        guide: {
          rate: values.rate,
          yearsOfExperience: values.yearsOfExperience,
          licenseNumber: values.licenseNumber,
          specializations: values.specializations || [],
          languages: values.languages || [],
        }
      };

      await dispatch(updateGuideProfile(guideData)).unwrap();
      setSnackbarMessage('Profile updated successfully');
      setSnackbarVisible(true);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to update profile:', error);
      setSnackbarMessage('Failed to update profile');
      setSnackbarVisible(true);
    }
  };

  const handleImageUploadSuccess = (data) => {
    setImageUploading(false);
    if (data && data.imageUrl) {
      dispatch(uploadProfileImage(data.imageUrl));
    }
  };

  const handleImageUploadError = (error) => {
    setImageUploading(false);
    setSnackbarMessage('Failed to upload image');
    setSnackbarVisible(true);
    console.error('Image upload error:', error);
  };

  // Request permission for camera/gallery access
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          alert('Sorry, we need camera roll permissions to change your profile picture!');
        }
      }
    })();
  }, []);

  // Handle image picking
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUploading(true);
        // Upload image to server and get URL
        const response = await dispatch(uploadProfileImage(result.assets[0].uri));
        if (response?.profileImage) {
          setImage(response.profileImage);
          setSnackbarMessage('Profile picture updated successfully');
          setSnackbarVisible(true);
        }
        setImageUploading(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setImageUploading(false);
      setSnackbarMessage('Failed to update profile picture');
      setSnackbarVisible(true);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.avatarContainer} disabled={imageUploading}>
            {imageUploading ? (
              <ActivityIndicator size="large" color={COLORS.primary} />
            ) : (
              <>
                {image ? (
                  <Image source={{ uri: image }} style={styles.avatarImage} />
                ) : (
                  <Avatar.Text
                    size={120}
                    label={`${user.firstName.charAt(0)}${user.lastName.charAt(0)}`}
                  />
                )}
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Guide Profile</Text>
          <Text style={styles.headerSubtitle}>
            Complete your profile to attract more tourists
          </Text>
        </View>
        
        <ImageUploader
          endpoint={API_ENDPOINTS.PROFILE.UPLOAD_IMAGE}
          initialImage={user?.avatar}
          onSuccess={handleImageUploadSuccess}
          onError={handleImageUploadError}
          buttonText="Update Profile Picture"
          style={styles.imageUploader}
        />
        
        <Formik
          initialValues={{
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            phoneNumber: user.phoneNumber || '',
            preferredLanguage: user.preferredLanguage || 'en',
            bio: user.bio || '',
            rate: user.guide?.rate?.toString() || '',
            yearsOfExperience: user.guide?.yearsOfExperience?.toString() || '',
            licenseNumber: user.guide?.licenseNumber || '',
            specializations: user.guide?.specializations || [],
            languages: user.guide?.languages || [],
          }}
          validationSchema={ProfileSchema}
          onSubmit={handleSaveProfile}
        >
          {({ handleChange, handleBlur, handleSubmit, setFieldValue, values, errors, touched }) => (
            <View style={styles.formContainer}>
              <TextInput
                label="First Name"
                value={values.firstName}
                onChangeText={handleChange('firstName')}
                onBlur={handleBlur('firstName')}
                style={styles.input}
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
                style={styles.input}
                error={touched.lastName && errors.lastName}
              />
              {touched.lastName && errors.lastName && (
                <HelperText type="error">{errors.lastName}</HelperText>
              )}

              <TextInput
                label="Phone Number"
                value={values.phoneNumber}
                onChangeText={handleChange('phoneNumber')}
                onBlur={handleBlur('phoneNumber')}
                style={styles.input}
                keyboardType="phone-pad"
                error={touched.phoneNumber && errors.phoneNumber}
              />
              {touched.phoneNumber && errors.phoneNumber && (
                <HelperText type="error">{errors.phoneNumber}</HelperText>
              )}

              <Text style={styles.labelText}>Preferred Language</Text>
              <View style={styles.languageContainer}>
                <TouchableOpacity
                  style={[
                    styles.languageOption,
                    values.preferredLanguage === 'en' && styles.selectedLanguage,
                  ]}
                  onPress={() => handleChange('preferredLanguage')('en')}
                >
                  <Text
                    style={[
                      styles.languageText,
                      values.preferredLanguage === 'en' && styles.selectedLanguageText,
                    ]}
                  >
                    English
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.languageOption,
                    values.preferredLanguage === 'si' && styles.selectedLanguage,
                  ]}
                  onPress={() => handleChange('preferredLanguage')('si')}
                >
                  <Text
                    style={[
                      styles.languageText,
                      values.preferredLanguage === 'si' && styles.selectedLanguageText,
                    ]}
                  >
                    Sinhala
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.languageOption,
                    values.preferredLanguage === 'ta' && styles.selectedLanguage,
                  ]}
                  onPress={() => handleChange('preferredLanguage')('ta')}
                >
                  <Text
                    style={[
                      styles.languageText,
                      values.preferredLanguage === 'ta' && styles.selectedLanguageText,
                    ]}
                  >
                    Tamil
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                label="Bio"
                value={values.bio}
                onChangeText={handleChange('bio')}
                onBlur={handleBlur('bio')}
                style={styles.input}
                multiline
                numberOfLines={4}
                error={touched.bio && errors.bio}
              />
              {touched.bio && errors.bio && (
                <HelperText type="error">{errors.bio}</HelperText>
              )}

              <TextInput
                label="Rate per Day (USD)"
                value={values.rate}
                onChangeText={handleChange('rate')}
                onBlur={handleBlur('rate')}
                style={styles.input}
                keyboardType="numeric"
                error={touched.rate && errors.rate}
              />
              {touched.rate && errors.rate && (
                <HelperText type="error">{errors.rate}</HelperText>
              )}

              <TextInput
                label="Years of Experience"
                value={values.yearsOfExperience}
                onChangeText={handleChange('yearsOfExperience')}
                onBlur={handleBlur('yearsOfExperience')}
                style={styles.input}
                keyboardType="numeric"
                error={touched.yearsOfExperience && errors.yearsOfExperience}
              />
              {touched.yearsOfExperience && errors.yearsOfExperience && (
                <HelperText type="error">{errors.yearsOfExperience}</HelperText>
              )}

              <TextInput
                label="License Number"
                value={values.licenseNumber}
                onChangeText={handleChange('licenseNumber')}
                onBlur={handleBlur('licenseNumber')}
                style={styles.input}
                error={touched.licenseNumber && errors.licenseNumber}
              />
              {touched.licenseNumber && errors.licenseNumber && (
                <HelperText type="error">{errors.licenseNumber}</HelperText>
              )}

              <Text style={styles.sectionLabel}>Specializations</Text>
              <View style={styles.specializationsContainer}>
                {SPECIALIZATIONS.map((specialization) => (
                  <Chip
                    key={specialization}
                    selected={selectedSpecializations.includes(specialization)}
                    onPress={() => handleSpecializationToggle(specialization, setFieldValue)}
                    style={[
                      styles.specializationChip,
                      selectedSpecializations.includes(specialization) && styles.selectedSpecializationChip,
                    ]}
                    textStyle={selectedSpecializations.includes(specialization) ? { color: '#fff' } : {}}
                    mode={selectedSpecializations.includes(specialization) ? 'flat' : 'outlined'}
                  >
                    {specialization}
                  </Chip>
                ))}
              </View>

              <Text style={styles.sectionLabel}>Languages I Speak</Text>
              <View style={styles.specializationsContainer}>
                {LANGUAGES.map((language) => (
                  <Chip
                    key={language.code}
                    selected={selectedLanguages.includes(language.code)}
                    onPress={() => handleLanguageToggle(language.code, setFieldValue)}
                    style={[
                      styles.specializationChip,
                      selectedLanguages.includes(language.code) && styles.selectedSpecializationChip,
                    ]}
                    textStyle={selectedLanguages.includes(language.code) ? { color: '#fff' } : {}}
                    mode={selectedLanguages.includes(language.code) ? 'flat' : 'outlined'}
                  >
                    {language.name}
                  </Chip>
                ))}
              </View>

              <View style={styles.buttonContainer}>
                <Button
                  mode="outlined"
                  style={styles.cancelButton}
                  onPress={() => navigation.goBack()}
                  disabled={isLoading || imageUploading}
                >
                  Cancel
                </Button>
                
                <Button
                  mode="contained"
                  style={styles.saveButton}
                  onPress={handleSubmit}
                  loading={isLoading || imageUploading}
                  disabled={isLoading || imageUploading}
                >
                  Save Changes
                </Button>
              </View>
            </View>
          )}
        </Formik>
      </ScrollView>
      
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={5000}
        action={{
          label: 'Dismiss',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    marginTop: 16,
    width: 160,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.primary,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 5,
    marginTop: 10,
    color: '#333',
  },
  input: {
    marginBottom: 15,
    backgroundColor: '#f5f5f5',
  },
  textArea: {
    marginBottom: 5,
    backgroundColor: '#f5f5f5',
    height: 100,
  },
  chipInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  chipInput: {
    flex: 1,
    marginRight: 10,
    backgroundColor: '#f5f5f5',
  },
  addButton: {
    marginLeft: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  chip: {
    margin: 4,
  },
  divider: {
    marginVertical: 20,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  buttonContainer: {
    marginTop: 20,
  },
  saveButton: {
    marginBottom: 10,
    paddingVertical: 8,
  },
  cancelButton: {
    borderColor: COLORS.error,
    paddingVertical: 8,
  },
  imageUploader: {
    marginBottom: 24,
  },
  formContainer: {
    padding: spacing.md,
  },
  labelText: {
    fontSize: 16,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    color: COLORS.text,
  },
  languageContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  languageOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginRight: spacing.sm,
  },
  selectedLanguage: {
    backgroundColor: COLORS.primary,
  },
  languageText: {
    color: COLORS.primary,
  },
  selectedLanguageText: {
    color: '#fff',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    color: COLORS.primary,
  },
  specializationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  specializationChip: {
    margin: 4,
  },
  selectedSpecializationChip: {
    backgroundColor: COLORS.primary,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
});

export default EditProfileScreen; 