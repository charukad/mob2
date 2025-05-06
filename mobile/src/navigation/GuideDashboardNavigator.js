import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';

// Import screens
import GuideDashboardScreen from '../screens/guide/DashboardScreen';
import GuideBookingsScreen from '../screens/guide/BookingsScreen';
import GuideReviewsScreen from '../screens/guide/ReviewsScreen';
import GuideEarningsScreen from '../screens/guide/EarningsScreen';
import ProfileNavigator from './ProfileNavigator';

// Import theme
import { COLORS } from '../constants/theme';

const Tab = createBottomTabNavigator();

const GuideDashboardNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#f0f0f0',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={GuideDashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="dashboard" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={GuideBookingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="calendar-today" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Reviews"
        component={GuideReviewsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="star" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Earnings"
        component={GuideEarningsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="account-balance-wallet" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          headerShown: false,
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" color={color} size={size} />
          ),
        }}
        initialParams={{ userRole: 'guide' }}
      />
    </Tab.Navigator>
  );
};

export default GuideDashboardNavigator;