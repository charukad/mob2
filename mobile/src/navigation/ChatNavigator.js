import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import ChatListScreen from '../screens/ChatListScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';

const Stack = createStackNavigator();

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

export default ChatNavigator; 