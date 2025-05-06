import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import EventsScreen from '../screens/events/EventsScreen';
import EventDetailScreen from '../screens/events/EventDetailScreen';
import CalendarScreen from '../screens/events/CalendarScreen';
import EventCalendarScreen from '../screens/events/EventCalendarScreen';
import CulturalInfoScreen from '../screens/events/CulturalInfoScreen';
import CulturalInfoDetailScreen from '../screens/events/CulturalInfoDetailScreen';
import ItinerarySelectorScreen from '../screens/events/ItinerarySelectorScreen';

const Stack = createStackNavigator();

const EventsNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Calendar"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Events" component={EventsScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="CalendarView" component={CalendarScreen} />
      <Stack.Screen name="EventCalendar" component={EventCalendarScreen} />
      <Stack.Screen name="CulturalInfo" component={CulturalInfoScreen} />
      <Stack.Screen name="CulturalInfoDetail" component={CulturalInfoDetailScreen} />
      <Stack.Screen name="ItinerarySelector" component={ItinerarySelectorScreen} />
    </Stack.Navigator>
  );
};

export default EventsNavigator;