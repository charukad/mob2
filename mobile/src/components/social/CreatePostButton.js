import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { Avatar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { COLORS, FONTS } from '../../constants/theme';
import { getAvatarUrl, getProfileImageFromGlobal } from '../../utils/profileUtils';

const CreatePostButton = ({ user }) => {
  const navigation = useNavigation();
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    const loadAvatar = async () => {
      try {
        // First try to get profile image using the same approach as profile screen
        if (user?.email) {
          const profileImageUrl = await getProfileImageFromGlobal(user.email);
          if (profileImageUrl && profileImageUrl.includes('cloudinary.com')) {
            setAvatarUrl(profileImageUrl);
            return;
          }
        }
        
        // Fall back to regular getAvatarUrl
        const url = getAvatarUrl(user);
        setAvatarUrl(url);
      } catch (error) {
        console.error('Error loading avatar:', error);
        // Fall back to getAvatarUrl on error
        const url = getAvatarUrl(user);
        setAvatarUrl(url);
      }
    };
    
    loadAvatar();
  }, [user]);

  const handleCreatePost = () => {
    navigation.navigate('CreatePost');
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleCreatePost}
      activeOpacity={0.8}
    >
      <Avatar.Image
        source={{
          uri: avatarUrl || 
               user?.profileImage || 
               user?.avatar || 
               (user?.firstName && user?.lastName ? 
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName)}+${encodeURIComponent(user.lastName)}&background=random&color=fff` : 
                  `https://ui-avatars.com/api/?name=U&background=random&color=fff&size=40`)
        }}
        size={40}
      />
      <View style={styles.promptContainer}>
        <Text style={styles.promptText}>Share your travel experience...</Text>
      </View>
      <View style={styles.iconsContainer}>
        <MaterialCommunityIcons name="camera" size={24} color={COLORS.primary} />
        <MaterialCommunityIcons name="map-marker" size={24} color={COLORS.primary} style={styles.icon} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  promptContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  promptText: {
    ...FONTS.body3,
    color: COLORS.gray,
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginLeft: 12,
  },
});

export default CreatePostButton;