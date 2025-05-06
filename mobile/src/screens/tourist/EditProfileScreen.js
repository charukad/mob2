import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { TextInput, Button, Snackbar, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/theme';
import { updateTouristProfile, uploadProfileImage } from '../../redux/actions/profileActions';

const validationSchema = Yup.object().shape({
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  email: Yup.string().email('Please enter a valid email').required('Email is required'),
  phone: Yup.string().required('Phone number is required'),
  nationality: Yup.string().required('Nationality is required'),
  bio: Yup.string(),
  interests: Yup.array().min(1, 'Select at least one interest'),
});

const TouristEditProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.auth);
  
  const [image, setImage] = useState(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const allInterests = [
    'Adventure', 'Cultural', 'Historical', 'Nature', 'Wildlife', 
    'Beach', 'Food', 'Shopping', 'Relaxation', 'Photography',
    'Hiking', 'Music', 'Art', 'Festivals', 'Spiritual'
  ];

  useEffect(() => {
    if (user?.profileImage) {
      setImage(user.profileImage);
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setSnackbarMessage('Permission to access media library is required!');
          setSnackbarVisible(true);
        }
      }
    })();
  }, []);

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        setIsImageUploading(true);
        
        // Upload image to server
        const uploadResult = await dispatch(uploadProfileImage(imageUri));
        
        if (uploadResult && uploadResult.profileImage) {
          setImage(uploadResult.profileImage);
          setSnackbarMessage('Profile image updated successfully');
        } else {
          setSnackbarMessage('Failed to upload image');
        }
        
        setSnackbarVisible(true);
        setIsImageUploading(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setSnackbarMessage('Error selecting image');
      setSnackbarVisible(true);
      setIsImageUploading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      await dispatch(updateTouristProfile(values));
      setSnackbarMessage('Profile updated successfully');
      setSnackbarVisible(true);
      
      // Navigate back after successful update
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      setSnackbarMessage('Failed to update profile');
      setSnackbarVisible(true);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileImageContainer}>
        {isImageUploading ? (
          <View style={styles.imageLoadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <Image
            source={image ? { uri: image } : require('../../../assets/images/default-avatar.png')}
            style={styles.profileImage}
          />
        )}
        <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
          <Ionicons name="camera" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <Formik
        initialValues={{
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          email: user?.email || '',
          phone: user?.phone || '',
          nationality: user?.nationality || '',
          bio: user?.bio || '',
          interests: user?.interests || [],
        }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <TextInput
              label="First Name"
              value={values.firstName}
              onChangeText={handleChange('firstName')}
              onBlur={handleBlur('firstName')}
              style={styles.input}
              error={touched.firstName && errors.firstName}
            />
            {touched.firstName && errors.firstName && (
              <Text style={styles.errorText}>{errors.firstName}</Text>
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
              <Text style={styles.errorText}>{errors.lastName}</Text>
            )}
            
            <TextInput
              label="Email"
              value={values.email}
              onChangeText={handleChange('email')}
              onBlur={handleBlur('email')}
              style={styles.input}
              keyboardType="email-address"
              error={touched.email && errors.email}
            />
            {touched.email && errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
            
            <TextInput
              label="Phone"
              value={values.phone}
              onChangeText={handleChange('phone')}
              onBlur={handleBlur('phone')}
              style={styles.input}
              keyboardType="phone-pad"
              error={touched.phone && errors.phone}
            />
            {touched.phone && errors.phone && (
              <Text style={styles.errorText}>{errors.phone}</Text>
            )}
            
            <TextInput
              label="Nationality"
              value={values.nationality}
              onChangeText={handleChange('nationality')}
              onBlur={handleBlur('nationality')}
              style={styles.input}
              error={touched.nationality && errors.nationality}
            />
            {touched.nationality && errors.nationality && (
              <Text style={styles.errorText}>{errors.nationality}</Text>
            )}
            
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
              <Text style={styles.errorText}>{errors.bio}</Text>
            )}
            
            <Text style={styles.sectionTitle}>Travel Interests</Text>
            <Text style={styles.helperText}>Select interests that match your travel preferences</Text>
            
            <View style={styles.interestsContainer}>
              {allInterests.map((interest) => (
                <Chip
                  key={interest}
                  selected={values.interests.includes(interest)}
                  style={[
                    styles.chip,
                    values.interests.includes(interest) && styles.selectedChip,
                  ]}
                  textStyle={values.interests.includes(interest) ? styles.selectedChipText : {}}
                  onPress={() => {
                    const newInterests = values.interests.includes(interest)
                      ? values.interests.filter((i) => i !== interest)
                      : [...values.interests, interest];
                    setFieldValue('interests', newInterests);
                  }}
                >
                  {interest}
                </Chip>
              ))}
            </View>
            {touched.interests && errors.interests && (
              <Text style={styles.errorText}>{errors.interests}</Text>
            )}
            
            <Button
              mode="contained"
              onPress={handleSubmit}
              style={styles.button}
              loading={loading}
              disabled={loading}
            >
              Update Profile
            </Button>
          </View>
        )}
      </Formik>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.lightGray,
  },
  imageLoadingContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerButton: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: COLORS.primary,
    padding: 8,
    borderRadius: 20,
    elevation: 5,
  },
  formContainer: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 12,
    color: COLORS.primary,
  },
  input: {
    marginBottom: 8,
    backgroundColor: COLORS.white,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 12,
  },
  helperText: {
    color: COLORS.gray,
    fontSize: 14,
    marginBottom: 10,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  chip: {
    margin: 4,
    backgroundColor: COLORS.lightGray,
  },
  selectedChip: {
    backgroundColor: COLORS.primary,
  },
  selectedChipText: {
    color: COLORS.white,
  },
  button: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
  },
  snackbar: {
    backgroundColor: COLORS.dark,
  },
});

export default TouristEditProfileScreen; 