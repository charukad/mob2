import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as StoreProvider, useDispatch, useSelector } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, StyleSheet, Image, Text, TouchableOpacity } from 'react-native';
import { ActivityIndicator, Button } from 'react-native-paper';
import * as Font from 'expo-font';
import { Asset } from 'expo-asset';
import { I18nextProvider } from 'react-i18next';
import offlineService from './src/services/offlineService';

// Import store, theme, and i18n
import store from './src/store';
import theme, { COLORS } from './src/constants/theme';
import i18n from './src/i18n';

// Import API config
import './src/api/axiosConfig';

// Import navigation
import AppNavigator from './src/navigation/AppNavigator';

// Import authentication actions
import { loadUser } from './src/store/slices/authSlice';

// Import profile image cache initializer
import { initProfileImageCache } from './src/utils/profileUtils';

// Import debug utilities
import { logAuthState } from './src/utils/debugUtils';

// Import loading component
import Loading from './src/components/common/Loading';

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore errors */
});

// Main App component that provides the necessary context providers
export default function App() {
  return (
    <StoreProvider store={store}>
      <I18nextProvider i18n={i18n}>
        <PaperProvider theme={theme}>
          <SafeAreaProvider>
            <NavigationContainer>
              <AppContent />
              <NetworkStatusBar />
              <StatusBar style="auto" />
            </NavigationContainer>
          </SafeAreaProvider>
        </PaperProvider>
      </I18nextProvider>
    </StoreProvider>
  );
}

// Preload assets (fonts and images)
async function cacheResourcesAsync() {
  try {
    const images = [
      require('./assets/images/logo-placeholder.png'),
      require('./assets/images/splash.png'),
    ];

    const cacheImages = images.map(image => {
      return Asset.fromModule(image).downloadAsync();
    });

    // Load fonts
    const fontAssets = Font.loadAsync({
      'roboto-regular': require('./assets/fonts/Roboto-Regular.ttf'),
      'roboto-bold': require('./assets/fonts/Roboto-Bold.ttf'),
      'roboto-medium': require('./assets/fonts/Roboto-Medium.ttf'),
    });

    return Promise.all([...cacheImages, fontAssets]);
  } catch (error) {
    console.warn('Error caching resources:', error);
    return Promise.resolve();
  }
}

// App content component that has access to Redux state
function AppContent() {
  const dispatch = useDispatch();
  
  // Use optional chaining and default object to prevent undefined errors
  const authState = useSelector((state) => state?.auth) || {};
  const { isLoading, isAuthenticated, user } = authState;
  
  const [appIsReady, setAppIsReady] = useState(false);
  const [initialAuthChecked, setInitialAuthChecked] = useState(false);
  const [error, setError] = useState(null);

  // Log auth state for debugging when it changes
  useEffect(() => {
    if (user) {
      console.log('User role from Redux:', user.role);
      logAuthState(authState);
    }
  }, [user, authState]);

  // Set up splash screen and check authentication
  useEffect(() => {
    async function prepare() {
      try {
        // Check for auth token
        const token = await AsyncStorage.getItem('authToken');
        console.log('Found auth token in storage:', !!token);
        
        // Check for user ID in AsyncStorage and fix if missing
        if (token) {
          const userId = await AsyncStorage.getItem('userId');
          console.log('Found user ID in storage:', userId);
          
          // If token exists but userId doesn't, try to fix it
          if (!userId) {
            console.log('User ID missing but token exists - attempting to recover user ID');
            
            // Try to get from user storage
            const userString = await AsyncStorage.getItem('user');
            if (userString) {
              try {
                const userData = JSON.parse(userString);
                if (userData && userData._id) {
                  console.log('Retrieved user ID from user storage:', userData._id);
                  await AsyncStorage.setItem('userId', userData._id);
                }
              } catch (parseError) {
                console.error('Error parsing user data:', parseError);
              }
            } else {
              // Try userData format
              const userDataString = await AsyncStorage.getItem('userData');
              if (userDataString) {
                try {
                  const userData = JSON.parse(userDataString);
                  if (userData && userData.user && userData.user._id) {
                    console.log('Retrieved user ID from userData storage:', userData.user._id);
                    await AsyncStorage.setItem('userId', userData.user._id);
                  }
                } catch (parseError) {
                  console.error('Error parsing userData:', parseError);
                }
              }
            }
          }
        }
        
        // Initialize profile image cache
        await initProfileImageCache();
        
        // Preload assets
        await cacheResourcesAsync();
        
        // Try to load user data if token exists
        if (token) {
          dispatch(loadUser());
        }
        
        // Artificial delay for smooth transition from splash screen
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setInitialAuthChecked(true);
      } catch (error) {
        console.warn('Error preparing app:', error);
        setError(error);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
        
        // Hide splash screen safely
        try {
          await SplashScreen.hideAsync();
        } catch (e) {
          // Ignore errors here
          console.warn('Error hiding splash screen:', e);
        }
      }
    }

    prepare();
  }, [dispatch]);

  // Handle errors during initialization
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Failed to start application</Text>
        <Text style={styles.errorMessage}>{error.message || 'Unknown error'}</Text>
        <Button
          mode="contained"
          onPress={() => window.location.reload()}
          style={{ marginTop: 20 }}
        >
          Restart
        </Button>
      </View>
    );
  }

  // Render null until we're ready
  if (!appIsReady) {
    return null;
  }

  // Show loading spinner while checking authentication
  if (isLoading && !initialAuthChecked) {
    return (
      <View style={styles.loadingContainer}>
        <Image 
          source={require('./assets/images/logo-placeholder.png')} 
          style={styles.loadingLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color={COLORS?.primary || '#2196F3'} style={styles.spinner} />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <>
      <AppNavigator />
    </>
  );
}

// Updated styles with fallback values for COLORS
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingLogo: {
    width: 150,
    height: 150,
    marginBottom: 30,
  },
  spinner: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#757575',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#F44336',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#757575',
  },
});

// Add this component for network status notification
const NetworkStatusBar = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [visible, setVisible] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const offlineThreshold = 3; // Number of consecutive offline checks before showing the bar

  useEffect(() => {
    // Create our own check that's more lenient
    const checkConnectionManually = async () => {
      try {
        // Try to access the local server first
        const { API_URL } = require('./src/constants/api');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        console.log(`[NetworkBar] Checking server at ${API_URL}`);
        const response = await fetch(`${API_URL}/health`, {
          method: 'HEAD',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // If we reach the server, we're "online" for our app's purposes
        if (response.ok || response.status === 404) {
          console.log('[NetworkBar] Server is reachable');
          return true;
        }
      } catch (error) {
        console.log('[NetworkBar] Server check failed:', error.message);
      }
      
      // Fallback to Google check
      try {
        // Try to fetch from a reliable external service
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('https://www.google.com', {
          method: 'HEAD',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        return response.ok;
      } catch (error) {
        return false;
      }
    };

    // Perform an initial manual check
    checkConnectionManually().then(isConnected => {
      if (isConnected) {
        setIsOnline(true);
        setOfflineCount(0);
      }
    });

    // Custom network check interval that's more forgiving
    const checkInterval = setInterval(async () => {
      const isConnected = await checkConnectionManually();
      
      if (!isConnected) {
        // We're offline, increment counter
        setOfflineCount(prev => {
          const newCount = prev + 1;
          // Only set offline if we've reached the threshold
          if (newCount >= offlineThreshold && isOnline) {
            setIsOnline(false);
            setVisible(true);
          }
          return newCount;
        });
      } else {
        // We're online, reset counter and status
        setOfflineCount(0);
        if (!isOnline) {
          setIsOnline(true);
        }
      }
    }, 5000); // Check every 5 seconds

    // Use the offline service as backup
    const unsubscribe = offlineService.subscribe(online => {
      // If offline service says we're online, trust it
      if (online) {
        setIsOnline(true);
        setOfflineCount(0);
      }
      // If offline service says we're offline, increment counter but don't immediately trust
      else if (offlineCount < offlineThreshold) {
        setOfflineCount(prev => prev + 1);
      }
    });

    // Initialize offline service
    offlineService.init().catch(error => {
      console.error('[NetworkBar] Failed to initialize offline service:', error);
    });

    // Cleanup on unmount
    return () => {
      clearInterval(checkInterval);
      unsubscribe();
    };
  }, [isOnline, offlineCount]);

  if (isOnline || !visible) return null; // Don't show anything when online or dismissed

  const handlePress = () => {
    // Toggle expanded state when clicked
    setExpanded(!expanded);
  };
  
  const handleDismiss = () => {
    // Just dismiss the notification
    setVisible(false);
    setIsOnline(true);
    setOfflineCount(0);
    
    // Force a network check  
    offlineService.checkConnectivity().then(result => {
      console.log('[NetworkBar] Manual connectivity check result:', result);
    });
  };
  
  const handleBypass = () => {
    // Enable bypass mode
    offlineService.setBypassMode(true);
    setVisible(false);
    setIsOnline(true);
  };

  return (
    <View style={{
      backgroundColor: '#d32f2f',
      padding: expanded ? 12 : 6,
      alignItems: 'center',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
    }}>
      <Text 
        style={{
          color: 'white',
          fontWeight: 'bold',
          fontSize: 12,
          marginBottom: expanded ? 8 : 0,
        }}
        onPress={handlePress}
      >
        No internet connection (tap for options)
      </Text>
      
      {expanded && (
        <View style={{ width: '100%', alignItems: 'center' }}>
          <Text style={{ color: 'white', fontSize: 10, marginBottom: 10, textAlign: 'center' }}>
            Your app is having trouble connecting to the internet,{'\n'}
            but you may be able to access your local server.
          </Text>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '90%' }}>
            <TouchableOpacity
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                padding: 8,
                borderRadius: 4,
                flex: 1,
                marginRight: 8,
                alignItems: 'center',
              }}
              onPress={handleDismiss}
            >
              <Text style={{ color: 'white', fontSize: 12 }}>Dismiss</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                padding: 8,
                borderRadius: 4,
                flex: 1,
                alignItems: 'center',
              }}
              onPress={handleBypass}
            >
              <Text style={{ color: 'white', fontSize: 12 }}>Bypass Checks</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};