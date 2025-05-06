import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import AlertsScreen from '../screens/notifications/AlertsScreen';
import NotificationSettingsScreen from '../screens/notifications/NotificationSettingsScreen';
import WeatherDetailScreen from '../screens/weather/WeatherDetailScreen';

const Stack = createStackNavigator();

const NotificationsNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
      />
      <Stack.Screen 
        name="Alerts" 
        component={AlertsScreen} 
      />
      <Stack.Screen 
        name="NotificationSettings" 
        component={NotificationSettingsScreen} 
      />
      <Stack.Screen 
        name="WeatherDetail" 
        component={WeatherDetailScreen} 
      />
    </Stack.Navigator>
  );
};

export default NotificationsNavigator;