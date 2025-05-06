import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { checkAuthToken } from '../../store/slices/socialSlice';
import { restoreAuthToken } from '../../store/slices/authSlice';
import { debugAuthState } from '../../utils/authUtils';

/**
 * Component to display detailed error information for debugging social post issues
 */
const PostErrorDisplay = ({ onRetry, errorMessage }) => {
  const dispatch = useDispatch();
  const { error, errorDetails } = useSelector(state => state.social);
  const auth = useSelector(state => state.auth);
  const [debugInfo, setDebugInfo] = useState(null);

  const handleTokenCheck = () => {
    dispatch(checkAuthToken());
  };
  
  const handleRestoreAuth = async () => {
    try {
      await dispatch(restoreAuthToken()).unwrap();
      setDebugInfo({ message: 'Auth tokens restored' });
    } catch (error) {
      setDebugInfo({ error: 'Failed to restore tokens: ' + error.message });
    }
  };
  
  const handleDebugAuth = async () => {
    const status = await debugAuthState(auth);
    setDebugInfo(status);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Error Loading Posts</Text>
      
      <Text style={styles.message}>
        {errorMessage || error || 'An error occurred while loading posts.'}
      </Text>
      
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Authentication Status:</Text>
        <Text>Token: {auth.token ? 'Present' : 'Missing'}</Text>
        <Text>Authenticated: {auth.isAuthenticated ? 'Yes' : 'No'}</Text>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={handleTokenCheck} style={styles.button}>
            <Text style={styles.buttonText}>Check Token</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleRestoreAuth} style={styles.button}>
            <Text style={styles.buttonText}>Restore Auth</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleDebugAuth} style={[styles.button, { backgroundColor: '#ff9800' }]}>
            <Text style={styles.buttonText}>Debug Auth</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {debugInfo && (
        <ScrollView style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Debug Information:</Text>
          <Text style={styles.codeBlock}>
            {JSON.stringify(debugInfo, null, 2)}
          </Text>
        </ScrollView>
      )}
      
      {errorDetails && (
        <ScrollView style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Error Details:</Text>
          <Text style={styles.detailText}>Status: {errorDetails.status}</Text>
          {errorDetails.data && (
            <>
              <Text style={styles.sectionTitle}>Server Response:</Text>
              <Text style={styles.codeBlock}>
                {JSON.stringify(errorDetails.data, null, 2)}
              </Text>
            </>
          )}
        </ScrollView>
      )}
      
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    margin: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#d32f2f',
  },
  message: {
    fontSize: 16,
    marginBottom: 16,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    color: '#555',
  },
  detailsContainer: {
    maxHeight: 300,
    marginBottom: 16,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
  },
  detailText: {
    fontSize: 14,
    marginBottom: 8,
  },
  codeBlock: {
    fontFamily: 'monospace',
    fontSize: 12,
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#2196f3',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  retryButton: {
    backgroundColor: '#4caf50',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
});

export default PostErrorDisplay; 