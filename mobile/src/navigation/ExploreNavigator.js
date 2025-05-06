import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import ExploreScreen from '../screens/maps/ExploreScreen';
import LocationDetailScreen from '../screens/maps/LocationDetailScreen';
import SearchScreen from '../screens/maps/SearchScreen';

const Stack = createStackNavigator();

const ExploreNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="ExploreMap"
      screenOptions={{
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen
        name="ExploreMap"
        component={ExploreScreen}
        options={{ 
          title: 'Explore Sri Lanka',
        }}
      />
      <Stack.Screen
        name="LocationDetail"
        component={LocationDetailScreen}
        options={({ route }) => ({ 
          title: route.params?.name || 'Location Details',
        })}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ 
          title: 'Search',
        }}
      />
    </Stack.Navigator>
  );
};

export default ExploreNavigator;