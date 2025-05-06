import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Import navigators
import ExploreNavigator from './ExploreNavigator';
import ItineraryNavigator from './ItineraryNavigator';
import SocialNavigator from './SocialNavigator';
import EventsNavigator from './EventsNavigator';
import ProfileNavigator from './ProfileNavigator';
import SearchNavigator from './SearchNavigator';
import ChatNavigator from './ChatNavigator';

// Import role check component
import RoleCheck from '../components/common/RoleCheck';

// Import theme
import { COLORS } from '../constants/theme';

const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
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
    <RoleCheck expectedRole="tourist" onPressSwitch={handleRoleMismatch}>
      <Tab.Navigator
        initialRouteName="ExploreTab"
        screenOptions={{
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.gray,
          tabBarStyle: {
            height: 60,
            paddingBottom: 10,
            paddingTop: 10,
          },
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="ExploreTab"
          component={ExploreNavigator}
          options={{
            tabBarLabel: 'Explore',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="map-search" color={color} size={size} />
            ),
          }}
        />
        
        <Tab.Screen
          name="ItineraryTab"
          component={ItineraryNavigator}
          options={{
            tabBarLabel: 'Itineraries',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="map-marker-path" color={color} size={size} />
            ),
          }}
        />
        
        <Tab.Screen
          name="SearchTab"
          component={SearchNavigator}
          options={{
            tabBarLabel: 'Search',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="magnify" color={color} size={size} />
            ),
          }}
        />
        
        <Tab.Screen
          name="ChatTab"
          component={ChatNavigator}
          options={{
            tabBarLabel: 'Messages',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="chat" color={color} size={size} />
            ),
            tabBarBadge: 2, // Remove in production or implement dynamic badge
          }}
        />
        
        <Tab.Screen
          name="EventsTab"
          component={EventsNavigator}
          options={{
            tabBarLabel: 'Events',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="calendar-star" color={color} size={size} />
            ),
          }}
        />
        
        <Tab.Screen
          name="SocialTab"
          component={SocialNavigator}
          options={{
            tabBarLabel: 'Social',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account-group" color={color} size={size} />
            ),
          }}
        />
        
        <Tab.Screen
          name="ProfileTab"
          component={ProfileNavigator}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account-circle" color={color} size={size} />
            ),
          }}
        />
      </Tab.Navigator>
    </RoleCheck>
  );
};

export default MainTabNavigator;