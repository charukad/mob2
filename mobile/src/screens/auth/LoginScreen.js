// src/screens/auth/LoginScreen.js

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, Snackbar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { login, clearAuthError } from '../../store/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Import theme and utilities
import { COLORS, spacing } from '../../constants/theme';

// Validation schema
const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { isLoading, authError } = useSelector((state) => state.auth);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [devModeClicks, setDevModeClicks] = useState(0);

  useEffect(() => {
    // Subscribe to network status updates
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    // Check initial status
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authError) {
      setSnackbarVisible(true);
    }
  }, [authError]);

  const handleLogin = (values) => {
    if (!isConnected) {
      // Check if we have cached credentials for this user
      AsyncStorage.getItem('lastLoginEmail').then(cachedEmail => {
        if (cachedEmail === values.email) {
          // We have cached credentials, proceed with login attempt
          dispatch(login(values));
        } else {
          // No cached credentials, show offline error
          Alert.alert(
            'Network Error',
            'You appear to be offline, and we don\'t have cached credentials for this account. Please connect to the internet and try again.',
            [{ text: 'OK' }]
          );
        }
      });
    } else {
      // Online, proceed normally
      dispatch(login(values))
        .unwrap()
        .then(userData => {
          // After successful login, ensure we have the userId set properly
          if (userData && userData.user && userData.user._id) {
            AsyncStorage.setItem('userId', userData.user._id)
              .then(() => console.log('User ID saved to AsyncStorage after login:', userData.user._id))
              .catch(err => console.error('Failed to save user ID after login:', err));
          }
        })
        .catch(error => console.error('Login failed:', error));
    }
  };

  const handleDevModeLogin = () => {
    // For development: This is a fallback method to help during development
    if (__DEV__) {
      Alert.alert(
        'Development Login',
        'Which role would you like to log in as?',
        [
          {
            text: 'Tourist',
            onPress: () => devLogin('tourist@example.com', 'password123', 'tourist')
          },
          {
            text: 'Guide',
            onPress: () => devLogin('guide@example.com', 'password123', 'guide')
          },
          {
            text: 'Vehicle Owner',
            onPress: () => devLogin('vehicle@example.com', 'password123', 'vehicleOwner')
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    }
  };

  const devLogin = async (email, password, role) => {
    try {
      // Create demo user data for development mode
      const demoUser = {
        _id: `demo_${role}_${Date.now()}`,
        email: email,
        firstName: 'Demo',
        lastName: role.charAt(0).toUpperCase() + role.slice(1),
        role: role,
        isVerified: true
      };
      
      // Generate a token (this is just for demo)
      const token = `demo_token_${Date.now()}`;
      const refreshToken = `demo_refresh_${Date.now()}`;
      
      // Save to AsyncStorage 
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('refreshToken', refreshToken);
      await AsyncStorage.setItem('user', JSON.stringify(demoUser));
      
      // Also save in userData format for compatibility
      const userData = {
        user: demoUser,
        token: token,
        refreshToken: refreshToken
      };
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      await AsyncStorage.setItem('lastLoginEmail', email);
      await AsyncStorage.setItem('cachedAuthData', JSON.stringify({
        user: demoUser,
        token,
        refreshToken
      }));
      
      // Update Redux store directly (ideally this would be through a reducer)
      dispatch({
        type: 'auth/login/fulfilled',
        payload: {
          user: demoUser,
          token,
          refreshToken
        }
      });
      
    } catch (error) {
      console.error('Dev login error:', error);
      Alert.alert('Error', 'Failed to create dev account');
    }
  };

  const dismissSnackbar = () => {
    setSnackbarVisible(false);
    dispatch(clearAuthError());
  };

  const incrementDevMode = () => {
    if (__DEV__) {
      const newCount = devModeClicks + 1;
      setDevModeClicks(newCount);
      
      if (newCount >= 5) {
        setDevModeClicks(0);
        handleDevModeLogin();
      }
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
        <TouchableOpacity 
          style={styles.logoContainer} 
          onPress={incrementDevMode}
          activeOpacity={0.9}
        >
          <Image
            source={require('../../../assets/images/logo-placeholder.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Sri Lanka Tourism Guide</Text>
        </TouchableOpacity>

        <View style={styles.formContainer}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={LoginSchema}
            onSubmit={handleLogin}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
              <View style={styles.form}>
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
                  label="Password"
                  value={values.password}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  secureTextEntry
                  style={styles.input}
                  error={touched.password && errors.password}
                />
                {touched.password && errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}

                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                  style={styles.forgotPasswordContainer}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  style={styles.loginButton}
                  loading={isLoading}
                  disabled={isLoading}
                >
                  Login
                </Button>

                <View style={styles.registerContainer}>
                  <Text style={styles.registerText}>Don't have an account? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.registerLink}>Register Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Formik>
        </View>
      </ScrollView>

      {!isConnected && (
        <View style={styles.offlineBar}>
          <Text style={styles.offlineText}>You are offline. Some features may be limited.</Text>
        </View>
      )}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={dismissSnackbar}
        duration={4000}
        style={styles.snackbar}
      >
        {authError}
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
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: spacing.xl * 2,
    marginBottom: spacing.xl,
  },
  logo: {
    width: 120,
    height: 120,
  },
  appName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: spacing.md,
    color: COLORS.primary,
  },
  formContainer: {
    marginTop: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    marginBottom: spacing.xl,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: spacing.sm,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    color: COLORS.error,
    marginBottom: spacing.md,
    marginTop: -spacing.sm,
    fontSize: 12,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
  },
  forgotPasswordText: {
    color: COLORS.primary,
  },
  loginButton: {
    borderRadius: 5,
    marginTop: spacing.md,
    paddingVertical: 6,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  registerText: {
    color: COLORS.gray,
  },
  registerLink: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  snackbar: {
    backgroundColor: COLORS.error,
  },
  offlineBar: {
    backgroundColor: 'orange',
    padding: 10,
    alignItems: 'center',
  },
  offlineText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default LoginScreen;