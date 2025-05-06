import React from 'react';
import { useSelector } from 'react-redux';
import { createStackNavigator } from '@react-navigation/stack';

// Import navigators
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import GuideDashboardNavigator from './GuideDashboardNavigator';
import VehicleOwnerDashboardNavigator from './VehicleOwnerDashboardNavigator';

// Import screens for navigation outside the main tabs
import ChatDetailScreen from '../screens/ChatDetailScreen';
import VehicleDetailScreen from '../screens/vehicleOwner/VehicleDetailScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  // Check if user is authenticated using Redux
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // Define a function to get the correct navigator based on user role
  const getNavigatorByRole = () => {
    // Log the user information for debugging
    console.log('User role from Redux:', user?.role);
    
    if (!user) return MainTabNavigator;
    
    switch (user.role) {
      case 'vehicleOwner':
        console.log('Routing to Vehicle Owner Dashboard');
        return VehicleOwnerDashboardNavigator;
      case 'guide':
        console.log('Routing to Guide Dashboard');
        return GuideDashboardNavigator;
      case 'tourist':
      default:
        console.log('Routing to Tourist Dashboard (Main)');
        return MainTabNavigator;
    }
  };

  // Get the appropriate navigator component
  const DashboardNavigator = getNavigatorByRole();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen 
          name="Auth" 
          component={AuthNavigator} 
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={DashboardNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ChatDetail"
            component={ChatDetailScreen}
            options={({ route }) => ({
              title: route.params?.participantName || 'Chat',
              headerTitleAlign: 'center',
            })}
          />
          <Stack.Screen
            name="VehicleDetail"
            component={VehicleDetailScreen}
            options={({ route }) => ({
              title: route.params?.title || 'Vehicle Details',
              headerTitleAlign: 'center',
            })}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;