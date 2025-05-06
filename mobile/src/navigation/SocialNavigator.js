import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import FeedScreen from '../screens/social/FeedScreen';
import CreatePostScreen from '../screens/social/CreatePostScreen';
import PostDetailScreen from '../screens/social/PostDetailScreen';
import UserProfileScreen from '../screens/social/UserProfileScreen';
import EditPostScreen from '../screens/social/EditPostScreen';
import LocationPickerScreen from '../screens/itinerary/LocationPickerScreen';

const Stack = createStackNavigator();

const SocialNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Feed"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Feed" component={FeedScreen} />
      <Stack.Screen name="CreatePost" component={CreatePostScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="EditPost" component={EditPostScreen} />
      <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
    </Stack.Navigator>
  );
};

export default SocialNavigator;