import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Switch, Text } from 'react-native';
import { Appbar, List, Divider, Button, Dialog, Portal, TextInput } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';

import { 
  fetchNotificationSettings, 
  updateNotificationSettings,
  resetNotificationSettings
} from '../../store/slices/notificationsSlice';

const NotificationSettingsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { settings, loading } = useSelector(state => state.notifications);
  const [localSettings, setLocalSettings] = useState({});
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showQuietHoursDialog, setShowQuietHoursDialog] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('');
  const [quietHoursEnd, setQuietHoursEnd] = useState('');
  
  useFocusEffect(
    React.useCallback(() => {
      dispatch(fetchNotificationSettings());
    }, [dispatch])
  );
  
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
      
      // Parse quiet hours
      if (settings.quietHours) {
        setQuietHoursStart(settings.quietHours.start || '22:00');
        setQuietHoursEnd(settings.quietHours.end || '07:00');
      }
    }
  }, [settings]);
  
  // Toggle a specific notification type
  const toggleNotification = (category, type) => {
    const updatedSettings = {
      ...localSettings,
      categories: {
        ...localSettings.categories,
        [category]: {
          ...localSettings.categories[category],
          [type]: !localSettings.categories[category][type]
        }
      }
    };
    
    setLocalSettings(updatedSettings);
    dispatch(updateNotificationSettings(updatedSettings));
  };
  
  // Toggle push notifications master switch
  const togglePushNotifications = () => {
    const updatedSettings = {
      ...localSettings,
      pushEnabled: !localSettings.pushEnabled
    };
    
    setLocalSettings(updatedSettings);
    dispatch(updateNotificationSettings(updatedSettings));
  };
  
  // Toggle email notifications master switch
  const toggleEmailNotifications = () => {
    const updatedSettings = {
      ...localSettings,
      emailEnabled: !localSettings.emailEnabled
    };
    
    setLocalSettings(updatedSettings);
    dispatch(updateNotificationSettings(updatedSettings));
  };
  
  // Toggle quiet hours
  const toggleQuietHours = () => {
    const updatedSettings = {
      ...localSettings,
      quietHoursEnabled: !localSettings.quietHoursEnabled
    };
    
    setLocalSettings(updatedSettings);
    dispatch(updateNotificationSettings(updatedSettings));
  };
  
  // Save quiet hours settings
  const saveQuietHours = () => {
    const updatedSettings = {
      ...localSettings,
      quietHours: {
        start: quietHoursStart,
        end: quietHoursEnd
      }
    };
    
    setLocalSettings(updatedSettings);
    dispatch(updateNotificationSettings(updatedSettings));
    setShowQuietHoursDialog(false);
  };
  
  // Reset all notification settings
  const handleResetSettings = () => {
    dispatch(resetNotificationSettings());
    setShowResetDialog(false);
  };
  
  // Validate time format (HH:MM)
  const isValidTimeFormat = (time) => {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
  };
  
  // Render notification category settings
  const renderCategorySettings = (category, title, types) => {
    if (!localSettings.categories || !localSettings.categories[category]) {
      return null;
    }
    
    return (
      <List.Section>
        <List.Subheader>{title}</List.Subheader>
        {types.map(type => (
          <List.Item
            key={`${category}-${type.key}`}
            title={type.label}
            description={type.description}
            right={() => (
              <Switch
                value={localSettings.categories[category][type.key]}
                onValueChange={() => toggleNotification(category, type.key)}
                disabled={!localSettings.pushEnabled && !localSettings.emailEnabled}
              />
            )}
          />
        ))}
        <Divider />
      </List.Section>
    );
  };
  
  if (!settings || Object.keys(settings).length === 0) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Notification Settings" />
        </Appbar.Header>
        <View style={styles.centered}>
          <Text>Loading settings...</Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Notification Settings" />
      </Appbar.Header>
      
      <ScrollView>
        <List.Section>
          <List.Subheader>General</List.Subheader>
          <List.Item
            title="Push Notifications"
            description="Receive push notifications on your device"
            right={() => (
              <Switch
                value={localSettings.pushEnabled}
                onValueChange={togglePushNotifications}
              />
            )}
          />
          <List.Item
            title="Email Notifications"
            description="Receive email notifications"
            right={() => (
              <Switch
                value={localSettings.emailEnabled}
                onValueChange={toggleEmailNotifications}
              />
            )}
          />
          <Divider />
        </List.Section>
        
        <List.Section>
          <List.Subheader>Quiet Hours</List.Subheader>
          <List.Item
            title="Enable Quiet Hours"
            description="Pause notifications during certain hours"
            right={() => (
              <Switch
                value={localSettings.quietHoursEnabled}
                onValueChange={toggleQuietHours}
              />
            )}
          />
          <List.Item
            title="Set Quiet Hours"
            description={`${quietHoursStart} - ${quietHoursEnd}`}
            onPress={() => setShowQuietHoursDialog(true)}
            disabled={!localSettings.quietHoursEnabled}
          />
          <Divider />
        </List.Section>
        
        {renderCategorySettings('alerts', 'Alerts & Advisories', [
          { key: 'weather', label: 'Weather Alerts', description: 'Storms, floods, and other weather events' },
          { key: 'safety', label: 'Safety Alerts', description: 'Travel advisories and safety warnings' },
          { key: 'traffic', label: 'Traffic Updates', description: 'Road closures and traffic conditions' },
          { key: 'health', label: 'Health Advisories', description: 'Health warnings and medical alerts' }
        ])}
        
        {renderCategorySettings('social', 'Social Notifications', [
          { key: 'likes', label: 'Likes', description: 'When someone likes your posts' },
          { key: 'comments', label: 'Comments', description: 'When someone comments on your posts' },
          { key: 'mentions', label: 'Mentions', description: 'When someone mentions you in a post' },
          { key: 'follows', label: 'New Followers', description: 'When someone follows you' }
        ])}
        
        {renderCategorySettings('bookings', 'Booking Notifications', [
          { key: 'confirmations', label: 'Booking Confirmations', description: 'When your booking is confirmed' },
          { key: 'reminders', label: 'Booking Reminders', description: 'Reminders about upcoming bookings' },
          { key: 'changes', label: 'Booking Changes', description: 'When details of your booking change' },
          { key: 'cancellations', label: 'Cancellations', description: 'When a booking is cancelled' }
        ])}
        
        {renderCategorySettings('messages', 'Message Notifications', [
          { key: 'newMessages', label: 'New Messages', description: 'When you receive a new message' },
          { key: 'groupMessages', label: 'Group Messages', description: 'Messages in group conversations' }
        ])}
        
        <View style={styles.resetContainer}>
          <Button 
            mode="outlined" 
            color="#F44336"
            onPress={() => setShowResetDialog(true)}
          >
            Reset to Default Settings
          </Button>
        </View>
      </ScrollView>
      
      {/* Reset Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={showResetDialog}
          onDismiss={() => setShowResetDialog(false)}
        >
          <Dialog.Title>Reset Settings</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to reset all notification settings to default values?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowResetDialog(false)}>Cancel</Button>
            <Button onPress={handleResetSettings}>Reset</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Quiet Hours Dialog */}
      <Portal>
        <Dialog
          visible={showQuietHoursDialog}
          onDismiss={() => setShowQuietHoursDialog(false)}
        >
          <Dialog.Title>Set Quiet Hours</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogLabel}>Start Time (24-hour format)</Text>
            <TextInput
              value={quietHoursStart}
              onChangeText={setQuietHoursStart}
              placeholder="22:00"
              keyboardType="numbers-and-punctuation"
              error={!isValidTimeFormat(quietHoursStart)}
              style={styles.timeInput}
            />
            <Text style={[styles.dialogLabel, styles.dialogLabelSpacing]}>End Time (24-hour format)</Text>
            <TextInput
              value={quietHoursEnd}
              onChangeText={setQuietHoursEnd}
              placeholder="07:00"
              keyboardType="numbers-and-punctuation"
              error={!isValidTimeFormat(quietHoursEnd)}
              style={styles.timeInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowQuietHoursDialog(false)}>Cancel</Button>
            <Button 
              onPress={saveQuietHours}
              disabled={!isValidTimeFormat(quietHoursStart) || !isValidTimeFormat(quietHoursEnd)}
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetContainer: {
    padding: 16,
    marginVertical: 16,
    alignItems: 'center',
  },
  dialogLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  dialogLabelSpacing: {
    marginTop: 16,
  },
  timeInput: {
    backgroundColor: '#F5F5F5',
  },
});

export default NotificationSettingsScreen;