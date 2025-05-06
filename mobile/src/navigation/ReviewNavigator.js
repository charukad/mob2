import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import ReviewsListScreen from '../screens/reviews/ReviewsListScreen';
import WriteReviewScreen from '../screens/reviews/WriteReviewScreen';
import MyReviewsScreen from '../screens/reviews/MyReviewsScreen';
import ReviewableEntitiesScreen from '../screens/reviews/ReviewableEntitiesScreen';

const Stack = createStackNavigator();

const ReviewNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false
      }}
    >
      <Stack.Screen name="MyReviews" component={MyReviewsScreen} />
      <Stack.Screen name="ReviewsList" component={ReviewsListScreen} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} />
      <Stack.Screen name="ReviewableEntities" component={ReviewableEntitiesScreen} />
    </Stack.Navigator>
  );
};

export default ReviewNavigator;