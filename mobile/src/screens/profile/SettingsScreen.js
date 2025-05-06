import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import { Text, List, Divider, Button, Appbar, ProgressBar, Portal, Dialog, RadioButton, Snackbar } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import * as FileSystem from 'expo-file-system';

// Import theme and API services
import { COLORS, spacing } from '../../constants/theme';
import api from '../../api/axios';
import { API_ENDPOINTS } from '../../constants/api';

// Import actions
import { updateUserSettings, logout } from '../../store/slices/authSlice';

// Language options for the app
const LANGUAGES = [
  { label: 'English', code: 'en' },
  { label: 'සිංහල (Sinhala)', code: 'si' },
  { label: 'தமிழ் (Tamil)', code: 'ta' },
];

const SettingsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  // Settings state
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    push: true,
    sms: false,
  });
  
  const [alertSettings, setAlertSettings] = useState({
    weather: true,
    safety: true,
    traffic: true,
    health: true,
  });
  
  const [socialSettings, setScocialSettings] = useState({
    likes: true,
    comments: true,
    mentions: true,
    follows: true,
  });
  
  const [bookingSettings, setBookingSettings] = useState({
    confirmations: true,
    reminders: true,
    changes: true,
    cancellations: true,
  });
  
  const [appearanceSettings, setAppearanceSettings] = useState({
    darkMode: false,
    fontScale: 1.0,
  });
  
  // Dialogs visibility state
  const [languageDialogVisible, setLanguageDialogVisible] = useState(false);
  const [cacheDialogVisible, setCacheDialogVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(user?.preferredLanguage || 'en');
  const [cacheSize, setCacheSize] = useState(0);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [dataLoading, setDataLoading] = useState(false);
  
  // Fetch settings data on component mount
  useEffect(() => {
    fetchNotificationSettings();
    calculateCacheSize();
  }, []);
  
  // Calculate app cache size
  const calculateCacheSize = async () => {
    try {
      // Get cache directory info
      const cacheInfo = await FileSystem.getInfoAsync(FileSystem.cacheDirectory);
      const imagesCacheInfo = await FileSystem.getInfoAsync(`${FileSystem.cacheDirectory}images/`);
      
      let totalSize = cacheInfo.size || 0;
      if (imagesCacheInfo.exists) {
        totalSize += imagesCacheInfo.size || 0;
      }
      
      // Convert to MB and round to 2 decimal places
      const cacheSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
      setCacheSize(cacheSizeMB);
    } catch (error) {
      console.error('Error calculating cache size:', error);
      setCacheSize(0);
    }
  };
  
  // Fetch notification settings from API
  const fetchNotificationSettings = async () => {
    try {
      setDataLoading(true);
      const response = await api.get(API_ENDPOINTS.USERS.NOTIFICATION_SETTINGS);
      
      const { data } = response.data;
      
      if (data) {
        setNotificationSettings({
          email: data.emailEnabled || false,
          push: data.pushEnabled || true,
          sms: false, // Default to false if not present
        });
        
        if (data.categories) {
          // Alert settings
          if (data.categories.alerts) {
            setAlertSettings({
              weather: data.categories.alerts.weather || true,
              safety: data.categories.alerts.safety || true,
              traffic: data.categories.alerts.traffic || true,
              health: data.categories.alerts.health || true,
            });
          }
          
          // Social settings
          if (data.categories.social) {
            setScocialSettings({
              likes: data.categories.social.likes || true,
              comments: data.categories.social.comments || true,
              mentions: data.categories.social.mentions || true,
              follows: data.categories.social.follows || true,
            });
          }
          
          // Booking settings
          if (data.categories.bookings) {
            setBookingSettings({
              confirmations: data.categories.bookings.confirmations || true,
              reminders: data.categories.bookings.reminders || true,
              changes: data.categories.bookings.changes || true,
              cancellations: data.categories.bookings.cancellations || true,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      Alert.alert(
        'Error',
        'Failed to fetch notification settings. Please try again later.'
      );
    } finally {
      setDataLoading(false);
    }
  };
  
  // Save notification settings
  const saveNotificationSettings = async () => {
    try {
      setDataLoading(true);
      
      const settings = {
        pushEnabled: notificationSettings.push,
        emailEnabled: notificationSettings.email,
        categories: {
          alerts: {
            weather: alertSettings.weather,
            safety: alertSettings.safety,
            traffic: alertSettings.traffic,
            health: alertSettings.health,
          },
          social: {
            likes: socialSettings.likes,
            comments: socialSettings.comments,
            mentions: socialSettings.mentions,
            follows: socialSettings.follows,
          },
          bookings: {
            confirmations: bookingSettings.confirmations,
            reminders: bookingSettings.reminders,
            changes: bookingSettings.changes,
            cancellations: bookingSettings.cancellations,
          },
        },
      };
      
      await api.put(API_ENDPOINTS.USERS.NOTIFICATION_SETTINGS, settings);
      
      setSnackbarMessage('Settings saved successfully');
      setSnackbarVisible(true);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      Alert.alert(
        'Error',
        'Failed to save notification settings. Please try again later.'
      );
    } finally {
      setDataLoading(false);
    }
  };
  
  // Update app language
  const updateLanguage = async () => {
    try {
      setDataLoading(true);
      
      // Call API to update user's preferred language
      await api.put(API_ENDPOINTS.USERS.UPDATE_PROFILE, {
        preferredLanguage: selectedLanguage,
      });
      
      // Update redux state
      dispatch(updateUserSettings({ preferredLanguage: selectedLanguage }));
      
      setLanguageDialogVisible(false);
      setSnackbarMessage('Language updated successfully');
      setSnackbarVisible(true);
      
      // In a real app, you would now reload translations
    } catch (error) {
      console.error('Error updating language:', error);
      Alert.alert('Error', 'Failed to update language. Please try again later.');
    } finally {
      setDataLoading(false);
    }
  };
  
  // Clear app cache
  const clearCache = async () => {
    try {
      setDataLoading(true);
      
      // Clear Async Storage (keep auth tokens)
      const keys = await AsyncStorage.getAllKeys();
      const authKeys = keys.filter(key => key.startsWith('auth_'));
      const keysToRemove = keys.filter(key => !key.startsWith('auth_'));
      
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
      
      // Clear file cache
      const cacheDirectory = FileSystem.cacheDirectory;
      await FileSystem.deleteAsync(cacheDirectory, { idempotent: true });
      
      // Recalculate cache size
      await calculateCacheSize();
      
      setCacheDialogVisible(false);
      setSnackbarMessage('Cache cleared successfully');
      setSnackbarVisible(true);
    } catch (error) {
      console.error('Error clearing cache:', error);
      Alert.alert('Error', 'Failed to clear cache. Please try again later.');
    } finally {
      setDataLoading(false);
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: () => dispatch(logout()),
          style: 'destructive',
        },
      ]
    );
  };
  
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Settings" />
        <Appbar.Action icon="content-save" onPress={saveNotificationSettings} disabled={dataLoading} />
      </Appbar.Header>
      
      {dataLoading && <ProgressBar indeterminate color={COLORS.primary} />}
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <List.Item
            title="Change Password"
            left={props => <List.Icon {...props} icon="lock" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('ChangePassword')}
          />
          <Divider />
          
          <List.Item
            title="Language"
            description={LANGUAGES.find(lang => lang.code === selectedLanguage)?.label || 'English'}
            left={props => <List.Icon {...props} icon="translate" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => setLanguageDialogVisible(true)}
          />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <List.Item
            title="Push Notifications"
            left={props => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={notificationSettings.push}
                onValueChange={(value) => setNotificationSettings(prev => ({ ...prev, push: value }))}
                color={COLORS.primary}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="Email Notifications"
            left={props => <List.Icon {...props} icon="email" />}
            right={() => (
              <Switch
                value={notificationSettings.email}
                onValueChange={(value) => setNotificationSettings(prev => ({ ...prev, email: value }))}
                color={COLORS.primary}
              />
            )}
          />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert Notifications</Text>
          
          <List.Item
            title="Weather Alerts"
            left={props => <List.Icon {...props} icon="weather-lightning" />}
            right={() => (
              <Switch
                value={alertSettings.weather}
                onValueChange={(value) => setAlertSettings(prev => ({ ...prev, weather: value }))}
                color={COLORS.primary}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="Safety Alerts"
            left={props => <List.Icon {...props} icon="shield" />}
            right={() => (
              <Switch
                value={alertSettings.safety}
                onValueChange={(value) => setAlertSettings(prev => ({ ...prev, safety: value }))}
                color={COLORS.primary}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="Traffic Alerts"
            left={props => <List.Icon {...props} icon="car" />}
            right={() => (
              <Switch
                value={alertSettings.traffic}
                onValueChange={(value) => setAlertSettings(prev => ({ ...prev, traffic: value }))}
                color={COLORS.primary}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="Health Alerts"
            left={props => <List.Icon {...props} icon="medical-bag" />}
            right={() => (
              <Switch
                value={alertSettings.health}
                onValueChange={(value) => setAlertSettings(prev => ({ ...prev, health: value }))}
                color={COLORS.primary}
              />
            )}
          />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social Notifications</Text>
          
          <List.Item
            title="Likes"
            left={props => <List.Icon {...props} icon="heart" />}
            right={() => (
              <Switch
                value={socialSettings.likes}
                onValueChange={(value) => setScocialSettings(prev => ({ ...prev, likes: value }))}
                color={COLORS.primary}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="Comments"
            left={props => <List.Icon {...props} icon="comment" />}
            right={() => (
              <Switch
                value={socialSettings.comments}
                onValueChange={(value) => setScocialSettings(prev => ({ ...prev, comments: value }))}
                color={COLORS.primary}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="Mentions"
            left={props => <List.Icon {...props} icon="at" />}
            right={() => (
              <Switch
                value={socialSettings.mentions}
                onValueChange={(value) => setScocialSettings(prev => ({ ...prev, mentions: value }))}
                color={COLORS.primary}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="New Followers"
            left={props => <List.Icon {...props} icon="account-plus" />}
            right={() => (
              <Switch
                value={socialSettings.follows}
                onValueChange={(value) => setScocialSettings(prev => ({ ...prev, follows: value }))}
                color={COLORS.primary}
              />
            )}
          />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Notifications</Text>
          
          <List.Item
            title="Booking Confirmations"
            left={props => <List.Icon {...props} icon="check-circle" />}
            right={() => (
              <Switch
                value={bookingSettings.confirmations}
                onValueChange={(value) => setBookingSettings(prev => ({ ...prev, confirmations: value }))}
                color={COLORS.primary}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="Booking Reminders"
            left={props => <List.Icon {...props} icon="alarm" />}
            right={() => (
              <Switch
                value={bookingSettings.reminders}
                onValueChange={(value) => setBookingSettings(prev => ({ ...prev, reminders: value }))}
                color={COLORS.primary}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="Booking Changes"
            left={props => <List.Icon {...props} icon="calendar-refresh" />}
            right={() => (
              <Switch
                value={bookingSettings.changes}
                onValueChange={(value) => setBookingSettings(prev => ({ ...prev, changes: value }))}
                color={COLORS.primary}
              />
            )}
          />
          <Divider />
          
          <List.Item
            title="Booking Cancellations"
            left={props => <List.Icon {...props} icon="calendar-remove" />}
            right={() => (
              <Switch
                value={bookingSettings.cancellations}
                onValueChange={(value) => setBookingSettings(prev => ({ ...prev, cancellations: value }))}
                color={COLORS.primary}
              />
            )}
          />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage</Text>
          
          <List.Item
            title="Clear Cache"
            description={`Current cache size: ${cacheSize} MB`}
            left={props => <List.Icon {...props} icon="cached" />}
            onPress={() => setCacheDialogVisible(true)}
          />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <List.Item
            title="Help Center"
            left={props => <List.Icon {...props} icon="help-circle" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('HelpCenter')}
          />
          <Divider />
          
          <List.Item
            title="Report a Problem"
            left={props => <List.Icon {...props} icon="bug" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('ReportProblem')}
          />
          <Divider />
          
          <List.Item
            title="About"
            left={props => <List.Icon {...props} icon="information" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('About')}
          />
        </View>
        
        <Button
          mode="outlined"
          style={styles.logoutButton}
          labelStyle={styles.logoutButtonLabel}
          onPress={handleLogout}
        >
          Logout
        </Button>
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
      
      {/* Language Selection Dialog */}
      <Portal>
        <Dialog
          visible={languageDialogVisible}
          onDismiss={() => setLanguageDialogVisible(false)}
        >
          <Dialog.Title>Select Language</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={value => setSelectedLanguage(value)}
              value={selectedLanguage}
            >
              {LANGUAGES.map((language) => (
                <RadioButton.Item
                  key={language.code}
                  label={language.label}
                  value={language.code}
                />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLanguageDialogVisible(false)}>Cancel</Button>
            <Button onPress={updateLanguage}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Clear Cache Dialog */}
      <Portal>
        <Dialog
          visible={cacheDialogVisible}
          onDismiss={() => setCacheDialogVisible(false)}
        >
          <Dialog.Title>Clear Cache</Dialog.Title>
          <Dialog.Content>
            <Text>
              This will clear all cached data and temporarily stored files. 
              Your account information and saved itineraries will not be affected.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCacheDialogVisible(false)}>Cancel</Button>
            <Button onPress={clearCache}>Clear</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Snackbar for messages */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: COLORS.surface,
    marginVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.divider,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    padding: spacing.md,
    paddingBottom: spacing.sm,
    color: COLORS.textLight,
  },
  logoutButton: {
    margin: spacing.lg,
    marginTop: spacing.xl,
    borderColor: COLORS.error,
  },
  logoutButtonLabel: {
    color: COLORS.error,
  },
  versionContainer: {
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: 0,
    marginBottom: spacing.xl,
  },
  versionText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  settingItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  settingTitle: {
    fontSize: 16,
    color: COLORS.text,
  },
  settingDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: spacing.xs,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  cacheInfo: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: spacing.xs,
  },
  progressBar: {
    marginTop: spacing.sm,
    backgroundColor: COLORS.divider,
  },
  dialogTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  dialogContent: {
    paddingHorizontal: spacing.md,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  languageLabel: {
    marginLeft: spacing.sm,
    fontSize: 16,
    color: COLORS.text,
  },
  dialogActions: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  cancelButton: {
    marginRight: spacing.sm,
  },
  dangerButton: {
    backgroundColor: COLORS.error,
  },
  dangerText: {
    color: COLORS.error,
  },
  divider: {
    backgroundColor: COLORS.divider,
  },
});

export default SettingsScreen;