import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Snackbar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { forgotPassword, clearAuthError, clearAuthMessage } from '../../store/slices/authSlice';

// Change this import to use the new utility file
import { colors, spacing } from '../../utils/themeUtils';

// Validation schema
const ForgotPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email')
    .required('Email is required'),
});

const ForgotPasswordScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { isLoading, authError, message, passwordResetSent } = useSelector((state) => state.auth);
  const [errorSnackbarVisible, setErrorSnackbarVisible] = useState(false);
  const [successSnackbarVisible, setSuccessSnackbarVisible] = useState(false);

  useEffect(() => {
    if (authError) {
      setErrorSnackbarVisible(true);
    }
  }, [authError]);

  useEffect(() => {
    if (message && passwordResetSent) {
      setSuccessSnackbarVisible(true);
    }
  }, [message, passwordResetSent]);

  const handleSubmit = (values) => {
    dispatch(forgotPassword(values.email));
  };

  const dismissErrorSnackbar = () => {
    setErrorSnackbarVisible(false);
    dispatch(clearAuthError());
  };

  const dismissSuccessSnackbar = () => {
    setSuccessSnackbarVisible(false);
    dispatch(clearAuthMessage());
    
    // Navigate back after a short delay
    if (passwordResetSent) {
      navigation.goBack();
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
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you instructions to reset your password.
          </Text>
        </View>

        <Formik
          initialValues={{ email: '' }}
          validationSchema={ForgotPasswordSchema}
          onSubmit={handleSubmit}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
            <View style={styles.formContainer}>
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

              <Button
                mode="contained"
                onPress={handleSubmit}
                style={styles.button}
                loading={isLoading}
                disabled={isLoading}
              >
                Send Reset Instructions
              </Button>
            </View>
          )}
        </Formik>

        <View style={styles.loginContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.loginLink}>← Back to Login</Text>
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
        duration={8}
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
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textLight,
    lineHeight: 22,
  },
  formContainer: {
    marginBottom: spacing.xl,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  button: {
    marginTop: spacing.md,
    paddingVertical: 8,
  },
  loginContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  loginLink: {
    color: colors.primary,
    fontSize: 16,
  },
  errorSnackbar: {
    backgroundColor: colors.error,
  },
  successSnackbar: {
    backgroundColor: colors.success,
  },
});

export default ForgotPasswordScreen;