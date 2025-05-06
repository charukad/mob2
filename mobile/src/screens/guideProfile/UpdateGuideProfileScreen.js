import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, HelperText, Text } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { COLORS } from '../../constants/theme';
import { API_ENDPOINTS } from '../../constants/api';
import ImageUploader from '../../components/common/ImageUploader';
import { updateGuideProfile, uploadGuideProfileImage } from '../../store/slices/guideProfileSlice';

const validationSchema = Yup.object().shape({
  bio: Yup.string().required('Bio is required'),
  languages: Yup.string().required('Languages are required'),
  specialties: Yup.string().required('Specialties are required'),
  experience: Yup.number().positive('Experience must be a positive number').required('Experience is required'),
  hourlyRate: Yup.number().positive('Hourly rate must be a positive number').required('Hourly rate is required'),
});

const UpdateGuideProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { guide, loading } = useSelector((state) => state.guideProfile);
  const [imageUploading, setImageUploading] = useState(false);

  const handleSaveProfile = async (values) => {
    try {
      await dispatch(updateGuideProfile(values)).unwrap();
      navigation.goBack();
    } catch (error) {
      console.error('Failed to update guide profile:', error);
    }
  };

  const handleImageUploadSuccess = (data) => {
    setImageUploading(false);
    if (data && data.imageUrl) {
      dispatch(uploadGuideProfileImage(data.imageUrl));
    }
  };

  const handleImageUploadError = (error) => {
    setImageUploading(false);
    console.error('Image upload error:', error);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Update Guide Profile</Text>
        
        <ImageUploader
          endpoint={API_ENDPOINTS.UPLOAD_IMAGE}
          initialImage={guide?.profileImage}
          onSuccess={handleImageUploadSuccess}
          onError={handleImageUploadError}
          buttonText="Update Profile Picture"
          style={styles.imageUploader}
        />

        <Formik
          initialValues={{
            bio: guide?.bio || '',
            languages: guide?.languages?.join(', ') || '',
            specialties: guide?.specialties?.join(', ') || '',
            experience: guide?.experience?.toString() || '',
            hourlyRate: guide?.hourlyRate?.toString() || '',
          }}
          validationSchema={validationSchema}
          onSubmit={handleSaveProfile}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
            <>
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
                label="Languages (comma separated)"
                value={values.languages}
                onChangeText={handleChange('languages')}
                onBlur={handleBlur('languages')}
                style={styles.input}
                error={touched.languages && errors.languages}
              />
              {touched.languages && errors.languages && (
                <HelperText type="error">{errors.languages}</HelperText>
              )}

              <TextInput
                label="Specialties (comma separated)"
                value={values.specialties}
                onChangeText={handleChange('specialties')}
                onBlur={handleBlur('specialties')}
                style={styles.input}
                error={touched.specialties && errors.specialties}
              />
              {touched.specialties && errors.specialties && (
                <HelperText type="error">{errors.specialties}</HelperText>
              )}

              <TextInput
                label="Experience (years)"
                value={values.experience}
                onChangeText={handleChange('experience')}
                onBlur={handleBlur('experience')}
                keyboardType="numeric"
                style={styles.input}
                error={touched.experience && errors.experience}
              />
              {touched.experience && errors.experience && (
                <HelperText type="error">{errors.experience}</HelperText>
              )}

              <TextInput
                label="Hourly Rate ($)"
                value={values.hourlyRate}
                onChangeText={handleChange('hourlyRate')}
                onBlur={handleBlur('hourlyRate')}
                keyboardType="numeric"
                style={styles.input}
                error={touched.hourlyRate && errors.hourlyRate}
              />
              {touched.hourlyRate && errors.hourlyRate && (
                <HelperText type="error">{errors.hourlyRate}</HelperText>
              )}

              <Button
                mode="contained"
                onPress={handleSubmit}
                style={styles.button}
                loading={loading}
                disabled={loading || imageUploading}
              >
                Save Profile
              </Button>
            </>
          )}
        </Formik>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: COLORS.primary,
  },
  imageUploader: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 8,
  },
  button: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
  },
});

export default UpdateGuideProfileScreen; 