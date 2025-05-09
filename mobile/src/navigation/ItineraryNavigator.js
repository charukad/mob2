import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import ItinerariesScreen from '../screens/itinerary/ItinerariesScreen';
import CreateItineraryScreen from '../screens/itinerary/CreateItineraryScreen';
import ItineraryDetailScreen from '../screens/itinerary/ItineraryDetailScreen';
import AddActivityScreen from '../screens/itinerary/AddActivityScreen';
import ActivityDetailScreen from '../screens/itinerary/ActivityDetailScreen';
import EditActivityScreen from '../screens/itinerary/EditActivityScreen';
import EditItineraryScreen from '../screens/itinerary/EditItineraryScreen';
import ItineraryMapScreen from '../screens/itinerary/ItineraryMapScreen';
import LocationPickerScreen from '../screens/itinerary/LocationPickerScreen';
import LocalItineraryDetailScreen from '../screens/itinerary/LocalItineraryDetailScreen';

const Stack = createStackNavigator();

const ItineraryNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Itineraries"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Itineraries" component={ItinerariesScreen} />
      <Stack.Screen name="CreateItinerary" component={CreateItineraryScreen} />
      <Stack.Screen name="ItineraryDetail" component={ItineraryDetailScreen} />
      <Stack.Screen name="AddActivity" component={AddActivityScreen} />
      <Stack.Screen name="ActivityDetail" component={ActivityDetailScreen} />
      <Stack.Screen name="EditActivity" component={EditActivityScreen} />
      <Stack.Screen name="EditItinerary" component={EditItineraryScreen} />
      <Stack.Screen name="ItineraryMap" component={ItineraryMapScreen} />
      <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
      <Stack.Screen name="LocalItineraryDetail" component={LocalItineraryDetailScreen} />
    </Stack.Navigator>
  );
};

export default ItineraryNavigator;