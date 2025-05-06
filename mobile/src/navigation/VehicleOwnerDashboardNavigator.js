import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Import screens
import VehicleOwnerBookingsScreen from '../screens/vehicleOwner/BookingsScreen';
import VehicleOwnerReviewsScreen from '../screens/vehicleOwner/ReviewsScreen';
import VehicleOwnerEarningsScreen from '../screens/vehicleOwner/EarningsScreen';
import ProfileNavigator from './ProfileNavigator';
import ChatListScreen from '../screens/ChatListScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';

// Import role check component
import RoleCheck from '../components/common/RoleCheck';

// Import theme
import { COLORS } from '../constants/theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Chat navigator stack
const ChatNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{
          title: 'Messages',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="ChatDetail"
        component={ChatDetailScreen}
        options={({ route }) => ({
          title: route.params?.participantName || 'Chat',
          headerTitleAlign: 'center',
        })}
      />
    </Stack.Navigator>
  );
};

const VehicleOwnerDashboardNavigator = () => {
  const navigation = useNavigation();
  
  // Handle role mismatch by navigating to auth screen and showing an alert
  const handleRoleMismatch = () => {
    // Reset navigation and go to Auth screen
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }]
    });
  };
  
  return (
    <RoleCheck expectedRole="vehicleOwner" onPressSwitch={handleRoleMismatch}>
      <Tab.Navigator
        initialRouteName="Bookings"
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
          name="Bookings"
          component={VehicleOwnerBookingsScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="calendar-today" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Chats"
          component={ChatNavigator}
          options={{
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="chat" color={color} size={size} />
            ),
            tabBarBadge: 3, // Remove this in production, or implement dynamic badge counter
          }}
        />
        <Tab.Screen
          name="Reviews"
          component={VehicleOwnerReviewsScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="star" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Earnings"
          component={VehicleOwnerEarningsScreen}
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
          initialParams={{ userRole: 'vehicleOwner' }}
        />
      </Tab.Navigator>
    </RoleCheck>
  );
};

export default VehicleOwnerDashboardNavigator; 