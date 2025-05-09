import React, { useEffect, useState } from 'react';
import { View, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import authService from '../../services/authService';
import { COLORS } from '../../constants/theme';

/**
 * Component to check authentication status and handle missing user ID issues
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render after auth check
 * @param {boolean} props.showLoading - Whether to show loading indicator during check
 * @param {boolean} props.redirectToLogin - Whether to redirect to login screen if auth fails
 * @param {function} props.onAuthStatusChanged - Callback with auth status result
 */
const AuthCheck = ({ 
  children, 
  showLoading = true,
  redirectToLogin = false,
  onAuthStatusChanged = null
}) => {
  const navigation = useNavigation();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const auth = useSelector(state => state.auth);
  
  // Check authentication status when component mounts
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setChecking(true);
        
        // Check if user is authenticated
        const hasAuth = await authService.isAuthenticated();
        
        // If user is not authenticated but Redux thinks they are, fix data inconsistency
        if (!hasAuth && auth.isAuthenticated) {
          console.warn('Auth inconsistency detected: Redux state authenticated but storage is not');
          
          // Try to recover user ID one more time
          const userId = await authService.getCurrentUserId(true);
          
          // If we still can't get a user ID, alert the user
          if (!userId && redirectToLogin) {
            Alert.alert(
              'Authentication Issue',
              'Your user session data is incomplete. Please log in again.',
              [{ 
                text: 'Go to Login', 
                onPress: () => navigation.navigate('Login')
              }]
            );
          }
          
          setAuthenticated(!!userId);
        } else {
          setAuthenticated(hasAuth);
        }
        
        // Call callback if provided
        if (onAuthStatusChanged) {
          onAuthStatusChanged(hasAuth);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setAuthenticated(false);
        
        // Call callback if provided
        if (onAuthStatusChanged) {
          onAuthStatusChanged(false);
        }
      } finally {
        setChecking(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Show loading indicator during check
  if (checking && showLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }
  
  // Render children after check completes
  return children;
};

export default AuthCheck; 