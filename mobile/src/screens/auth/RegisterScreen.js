// src/screens/auth/RegisterScreen.js

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, RadioButton, Snackbar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { register, clearAuthError, clearAuthMessage } from '../../store/slices/authSlice';

// Change this import to use the new utility file
import { colors, spacing } from '../../utils/themeUtils';

// Validation schema
const RegisterSchema = Yup.object().shape({
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  email: Yup.string()
    .email('Invalid email')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required'),
  phoneNumber: Yup.string()
    .matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/, 'Phone number is not valid')
    .optional(),
  role: Yup.string()
    .oneOf(['tourist', 'guide', 'vehicleOwner'], 'Invalid role')
    .required('Please select a role'),
});

const RegisterScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { isLoading, authError, message } = useSelector((state) => state.auth);
  const [errorSnackbarVisible, setErrorSnackbarVisible] = useState(false);
  const [successSnackbarVisible, setSuccessSnackbarVisible] = useState(false);

  useEffect(() => {
    if (authError) {
      setErrorSnackbarVisible(true);
    }
  }, [authError]);

  useEffect(() => {
    if (message) {
      setSuccessSnackbarVisible(true);
    }
  }, [message]);

  const handleRegister = (values) => {
    // Remove confirmPassword as it's not needed for the API
    const { confirmPassword, ...userData } = values;
    dispatch(register(userData));
  };

  const dismissErrorSnackbar = () => {
    setErrorSnackbarVisible(false);
    dispatch(clearAuthError());
  };

  const dismissSuccessSnackbar = () => {
    setSuccessSnackbarVisible(false);
    dispatch(clearAuthMessage());
    
    // Navigate to login screen after successful registration
    if (message) {
      navigation.navigate('Login');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join our community of travelers</Text>
        </View>

        <Formik
          initialValues={{
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            confirmPassword: '',
            phoneNumber: '',
            role: 'tourist',
          }}
          validationSchema={RegisterSchema}
          onSubmit={handleRegister}
        >
          {({ handleChange, handleBlur, handleSubmit, setFieldValue, values, errors, touched }) => (
            <View style={styles.formContainer}>
              <View style={styles.nameContainer}>
                <View style={styles.nameField}>
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
                </View>

                <View style={styles.nameField}>
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
                </View>
              </View>

              <TextInput
                label="Email"
                value={values.email}
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                error={touched.email && errors.email}
              />
              {touched.email && errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}

              <TextInput
                label="Phone Number (Optional)"
                value={values.phoneNumber}
                onChangeText={handleChange('phoneNumber')}
                onBlur={handleBlur('phoneNumber')}
                style={styles.input}
                keyboardType="phone-pad"
                error={touched.phoneNumber && errors.phoneNumber}
              />
              {touched.phoneNumber && errors.phoneNumber && (
                <Text style={styles.errorText}>{errors.phoneNumber}</Text>
              )}

              <TextInput
                label="Password"
                value={values.password}
                onChangeText={handleChange('password')}
                onBlur={handleBlur('password')}
                secureTextEntry
                style={styles.input}
                error={touched.password && errors.password}
                textContentType="none"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {touched.password && errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}

              <TextInput
                label="Confirm Password"
                value={values.confirmPassword}
                onChangeText={handleChange('confirmPassword')}
                onBlur={handleBlur('confirmPassword')}
                secureTextEntry
                style={styles.input}
                error={touched.confirmPassword && errors.confirmPassword}
                textContentType="none"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {touched.confirmPassword && errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}

              <Text style={styles.roleLabel}>I am a:</Text>
              <RadioButton.Group
                onValueChange={(value) => setFieldValue('role', value)}
                value={values.role}
              >
                <View style={styles.radioContainer}>
                  <View style={styles.radioButton}>
                    <RadioButton.Android value="tourist" color={colors.primary} />
                    <Text>Tourist</Text>
                  </View>
                  
                  <View style={styles.radioButton}>
                    <RadioButton.Android value="guide" color={colors.primary} />
                    <Text>Local Guide</Text>
                  </View>
                  
                  <View style={styles.radioButton}>
                    <RadioButton.Android value="vehicleOwner" color={colors.primary} />
                    <Text>Vehicle Owner</Text>
                  </View>
                </View>
              </RadioButton.Group>
              {touched.role && errors.role && (
                <Text style={styles.errorText}>{errors.role}</Text>
              )}

              <Button
                mode="contained"
                onPress={handleSubmit}
                style={styles.button}
                loading={isLoading}
                disabled={isLoading}
              >
                Create Account
              </Button>
            </View>
          )}
        </Formik>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Error Snackbar */}
      <Snackbar
        visible={errorSnackbarVisible}
        onDismiss={dismissErrorSnackbar}
        duration={3000}
        style={styles.errorSnackbar}
      >
        {authError}
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar
        visible={successSnackbarVisible}
        onDismiss={dismissSuccessSnackbar}
        duration={5008}
        style={styles.successSnackbar}
      >
        {message}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,  // This was causing the error
  },
  scrollContainer: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textLight,
  },
  formContainer: {
    marginBottom: spacing.lg,
  },
  nameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nameField: {
    flex: 0.48,
  },
  input: {
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  roleLabel: {
    fontSize: 16,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  radioContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  button: {
    marginTop: spacing.md,
    paddingVertical: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  loginText: {
    color: colors.textLight,
  },
  loginLink: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  errorSnackbar: {
    backgroundColor: colors.error,
  },
  successSnackbar: {
    backgroundColor: colors.success,
  },
});

export default RegisterScreen;