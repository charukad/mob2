import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ReviewNavigator from './ReviewNavigator';

// Import screens
import GuideProfileScreen from '../screens/guide/ProfileScreen';
import TouristProfileScreen from '../screens/tourist/ProfileScreen';
import VehicleOwnerProfileScreen from '../screens/vehicleOwner/ProfileScreen';
import GuideEditProfileScreen from '../screens/guide/EditProfileScreen';
import TouristEditProfileScreen from '../screens/tourist/EditProfileScreen';
import VehicleOwnerEditProfileScreen from '../screens/vehicleOwner/EditProfileScreen';
import ManageVehiclesScreen from '../screens/vehicleOwner/ManageVehiclesScreen';
import AddVehicleScreen from '../screens/vehicleOwner/AddVehicleScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import MyBookingsScreen from '../screens/bookings/MyBookingsScreen';

const Stack = createStackNavigator();

const ProfileNavigator = ({ route }) => {
  // Determine which screens to use based on user role
  const userRole = route?.params?.userRole || 'tourist';
  
  // Select the appropriate profile component based on user role
  let ProfileComponent;
  let EditProfileComponent;
  let profileTitle;
  
  switch(userRole) {
    case 'guide':
      ProfileComponent = GuideProfileScreen;
      EditProfileComponent = GuideEditProfileScreen;
      profileTitle = 'Edit Guide Profile';
      break;
    case 'vehicleOwner':
      ProfileComponent = VehicleOwnerProfileScreen;
      EditProfileComponent = VehicleOwnerEditProfileScreen;
      profileTitle = 'Edit Vehicle Owner Profile';
      break;
    case 'tourist':
    default:
      ProfileComponent = TouristProfileScreen;
      EditProfileComponent = TouristEditProfileScreen;
      profileTitle = 'Edit Profile';
      break;
  }

  return (
    <Stack.Navigator
      initialRouteName="ProfileMain"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileComponent} 
        initialParams={{ userRole }}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileComponent} 
        options={{
          headerShown: true,
          title: profileTitle,
          headerStyle: {
            backgroundColor: '#f8f8f8',
            elevation: 0,
            shadowOpacity: 0,
          },
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ 
          title: 'Settings',
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ 
          title: 'Notifications',
        }}
      />
      <Stack.Screen
        name="MyBookings"
        component={MyBookingsScreen}
        options={{ 
          title: 'My Bookings',
        }}
      />
      <Stack.Screen
        name="ManageVehicles"
        component={ManageVehiclesScreen}
        options={{
          headerShown: true,
          title: 'Manage Vehicles',
        }}
      />
      <Stack.Screen
        name="AddVehicle"
        component={AddVehicleScreen}
        options={{
          headerShown: true,
          title: 'Add Vehicle',
        }}
      />
      <Stack.Screen 
        name="Reviews" 
        component={ReviewNavigator} 
      />
    </Stack.Navigator>
  );
};

export default ProfileNavigator;