import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { restoreAuthToken } from '../../store/slices/authSlice';
import { debugAuthState } from '../../utils/authUtils';

/**
 * A component that helps detect and recover from authentication errors
 * Wrap this around components that require authentication
 */
const AuthErrorBoundary = ({ children, onAuthFailure }) => {
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);
  const dispatch = useDispatch();
  const auth = useSelector(state => state.auth);

  // Check auth state when mounted and when auth state changes
  useEffect(() => {
    const validateAuth = async () => {
      try {
        // If we don't have a token but think we're authenticated, that's an error
        if (!auth.token && auth.isAuthenticated) {
          console.log('AuthErrorBoundary: Inconsistent auth state detected');
          setHasError(true);
          setErrorInfo({ message: 'Token missing but authenticated state is true' });
          return;
        }
        
        // If we're not authenticated, try to restore auth
        if (!auth.isAuthenticated) {
          console.log('AuthErrorBoundary: Not authenticated, attempting to restore');
          const result = await dispatch(restoreAuthToken()).unwrap();
          
          if (!result || !auth.isAuthenticated) {
            console.log('AuthErrorBoundary: Auth restoration failed');
            setHasError(true);
            setErrorInfo({ message: 'Authentication required' });
            return;
          }
        }
        
        // We're authenticated, clear any errors
        setHasError(false);
        setErrorInfo(null);
      } catch (error) {
        console.error('AuthErrorBoundary error:', error);
        setHasError(true);
        setErrorInfo({ message: error.message || 'Authentication error' });
      }
    };

    validateAuth();
  }, [auth.token, auth.isAuthenticated, dispatch]);

  const handleRetry = async () => {
    try {
      await dispatch(restoreAuthToken()).unwrap();
      setHasError(false);
      setErrorInfo(null);
    } catch (error) {
      console.error('Failed to restore auth on retry:', error);
      
      // If retry fails and we have an onAuthFailure handler, call it
      if (onAuthFailure) {
        onAuthFailure();
      }
    }
  };
  
  const handleDebug = async () => {
    const status = await debugAuthState(auth);
    setErrorInfo({ ...errorInfo, debug: status });
  };

  if (hasError) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Authentication Required</Text>
        <Text style={styles.message}>
          {errorInfo?.message || 'You need to be logged in to access this feature'}
        </Text>
        
        {errorInfo?.debug && (
          <View style={styles.debugContainer}>
            <Text style={styles.debug}>
              {JSON.stringify(errorInfo.debug, null, 2)}
            </Text>
          </View>
        )}
        
        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={handleRetry} style={styles.button}>
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleDebug} style={[styles.button, { backgroundColor: '#ff9800' }]}>
            <Text style={styles.buttonText}>Debug</Text>
          </TouchableOpacity>
          
          {onAuthFailure && (
            <TouchableOpacity onPress={onAuthFailure} style={[styles.button, { backgroundColor: '#f44336' }]}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return children;
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    margin: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#d32f2f',
  },
  message: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  debugContainer: {
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    width: '100%',
    marginBottom: 20,
  },
  debug: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  button: {
    backgroundColor: '#2196f3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default AuthErrorBoundary; 