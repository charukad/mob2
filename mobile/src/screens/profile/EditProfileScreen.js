import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Text, TextInput, Button, Avatar, Snackbar, HelperText } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { Formik } from 'formik';
import * as Yup from 'yup';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, spacing } from '../../constants/theme';
import Loading from '../../components/common/Loading';
import api from '../../api/axios';
import { API_ENDPOINTS } from '../../constants/api';
import ImageUploader from '../../components/common/ImageUploader';
import { updateProfile, uploadProfileImage } from '../../store/slices/profileSlice';

// Validation schema
const ProfileSchema = Yup.object().shape({
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  phoneNumber: Yup.string()
    .matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/, 'Phone number is not valid')
    .optional(),
  preferredLanguage: Yup.string().oneOf(['en', 'si', 'ta']).required('Preferred language is required'),
  bio: Yup.string().max(200, 'Bio must be less than 200 characters'),
});

const EditProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.profile);
  const [imageUploading, setImageUploading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  if (!user) {
    return <Loading />;
  }

  const handleSaveProfile = async (values) => {
    try {
      await dispatch(updateProfile(values)).unwrap();
      navigation.goBack();
    } catch (error) {
      console.error('Failed to update profile:', error);
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
    console.error('Image upload error:', error);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.avatarContainer} disabled={imageUploading}>
          {user.profileImage ? (
            <Avatar.Image size={120} source={{ uri: user.profileImage }} />
          ) : (
            <Avatar.Text
              size={120}
              label={`${user.firstName.charAt(0)}${user.lastName.charAt(0)}`}
            />
          )}
        </TouchableOpacity>
      </View>

      <ImageUploader
        endpoint={API_ENDPOINTS.UPLOAD_IMAGE}
        initialImage={user?.profileImage}
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
        }}
        validationSchema={ProfileSchema}
        onSubmit={handleSaveProfile}
      >
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
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

            <View style={styles.buttonsContainer}>
              <Button
                mode="outlined"
                style={styles.cancelButton}
                onPress={() => navigation.goBack()}
                disabled={loading}
              >
                Cancel
              </Button>
              
              <Button
                mode="contained"
                style={styles.saveButton}
                onPress={handleSubmit}
                loading={loading}
                disabled={loading || imageUploading}
              >
                Save Changes
              </Button>
            </View>
          </View>
        )}
      </Formik>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: COLORS.primary,
  },
  avatarContainer: {
    position: 'relative',
  },
  imageUploader: {
    marginBottom: 24,
  },
  formContainer: {
    padding: spacing.lg,
  },
  input: {
    marginBottom: spacing.sm,
    backgroundColor: COLORS.surface,
  },
  labelText: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: spacing.sm,
  },
  languageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  languageOption: {
    flex: 1,
    marginHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  selectedLanguage: {
    backgroundColor: COLORS.primary,
  },
  languageText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  selectedLanguageText: {
    color: COLORS.background,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    marginRight: spacing.sm,
  },
  saveButton: {
    flex: 1,
    marginLeft: spacing.sm,
  },
});

export default EditProfileScreen;