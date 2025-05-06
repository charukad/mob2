import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Appbar, Avatar, Text, Button, Divider, Chip, ActivityIndicator } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// This would be imported from your social slice when implemented
// import { fetchUserProfile, followUser, unfollowUser } from '../../store/slices/socialSlice';

const UserProfileScreen = ({ route, navigation }) => {
  const { userId, username } = route.params || {};
  const dispatch = useDispatch();
  
  // These would come from your Redux state when implemented
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentTab, setCurrentTab] = useState('posts');
  
  // Fetch user profile when component mounts
  useEffect(() => {
    fetchUserData();
  }, [userId]);
  
  // Placeholder for actual API fetch
  const fetchUserData = async () => {
    try {
      setLoading(true);
      // When implementing for real, replace this with actual API calls:
      // await dispatch(fetchUserProfile(userId));
      
      // This is just mock data for now
      setTimeout(() => {
        setProfile({
          id: userId || '123',
          name: username || 'Travel Enthusiast',
          username: username || 'traveler',
          bio: 'Exploring beautiful Sri Lanka one adventure at a time! 🌴✈️',
          avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
          coverPhoto: 'https://images.unsplash.com/photo-1566296412376-c3b9d8233554',
          postsCount: 24,
          followersCount: 348,
          followingCount: 125,
          location: 'Colombo, Sri Lanka',
          joinedDate: 'January 2023'
        });
        
        setPosts([
          {
            id: '1',
            images: ['https://images.unsplash.com/photo-1580181590158-7a2d0a7b0398'],
            caption: 'Beautiful sunset at Galle Fort',
            location: 'Galle, Sri Lanka',
            likes: 56,
            comments: 8,
            date: '2023-04-15T14:30:00Z'
          },
          {
            id: '2',
            images: ['https://images.unsplash.com/photo-1546708379-1732fb4e8876'],
            caption: 'Tea plantations in Nuwara Eliya',
            location: 'Nuwara Eliya, Sri Lanka',
            likes: 42,
            comments: 5,
            date: '2023-04-10T09:15:00Z'
          },
          {
            id: '3',
            images: ['https://images.unsplash.com/photo-1540202404-1b927e27fa8b'],
            caption: 'Exploring the ancient city of Sigiriya',
            location: 'Sigiriya, Sri Lanka',
            likes: 78,
            comments: 12,
            date: '2023-04-05T11:45:00Z'
          }
        ]);
        
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setLoading(false);
    }
  };
  
  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  };
  
  // Handle follow/unfollow
  const handleFollowToggle = () => {
    if (isFollowing) {
      // dispatch(unfollowUser(userId));
      setIsFollowing(false);
      // Update followers count
      setProfile(prev => ({
        ...prev,
        followersCount: prev.followersCount - 1
      }));
    } else {
      // dispatch(followUser(userId));
      setIsFollowing(true);
      // Update followers count
      setProfile(prev => ({
        ...prev,
        followersCount: prev.followersCount + 1
      }));
    }
  };
  
  // Render header with profile information
  const renderProfileHeader = () => {
    if (!profile) return null;
    
    return (
      <View style={styles.profileHeader}>
        <View style={styles.coverPhotoContainer}>
          {profile.coverPhoto && (
            <Image 
              source={{ uri: profile.coverPhoto }} 
              style={styles.coverPhoto}
            />
          )}
        </View>
        
        <View style={styles.profileInfoContainer}>
          <Avatar.Image 
            source={{ uri: profile.avatar }} 
            size={80} 
            style={styles.avatar}
          />
          
          <View style={styles.nameContainer}>
            <Text style={styles.displayName}>{profile.name}</Text>
            <Text style={styles.username}>@{profile.username}</Text>
          </View>
          
          <Button
            mode={isFollowing ? "outlined" : "contained"}
            onPress={handleFollowToggle}
            style={styles.followButton}
          >
            {isFollowing ? "Following" : "Follow"}
          </Button>
        </View>
        
        {profile.bio && (
          <Text style={styles.bio}>{profile.bio}</Text>
        )}
        
        <View style={styles.profileStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.postsCount}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.followersCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>
        
        <View style={styles.profileDetails}>
          {profile.location && (
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="map-marker" size={16} color="#757575" />
              <Text style={styles.detailText}>{profile.location}</Text>
            </View>
          )}
          
          {profile.joinedDate && (
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="calendar" size={16} color="#757575" />
              <Text style={styles.detailText}>Joined {profile.joinedDate}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.tabsContainer}>
          <Chip
            selected={currentTab === 'posts'}
            onPress={() => setCurrentTab('posts')}
            style={[styles.tab, currentTab === 'posts' && styles.selectedTab]}
            textStyle={currentTab === 'posts' ? styles.selectedTabText : null}
          >
            Posts
          </Chip>
          
          <Chip
            selected={currentTab === 'photos'}
            onPress={() => setCurrentTab('photos')}
            style={[styles.tab, currentTab === 'photos' && styles.selectedTab]}
            textStyle={currentTab === 'photos' ? styles.selectedTabText : null}
          >
            Photos
          </Chip>
          
          <Chip
            selected={currentTab === 'likes'}
            onPress={() => setCurrentTab('likes')}
            style={[styles.tab, currentTab === 'likes' && styles.selectedTab]}
            textStyle={currentTab === 'likes' ? styles.selectedTabText : null}
          >
            Likes
          </Chip>
        </View>
        
        <Divider />
      </View>
    );
  };
  
  // Render post item
  const renderPostItem = ({ item }) => {
    return (
      <View style={styles.postItem}>
        {item.images && item.images.length > 0 && (
          <Image
            source={{ uri: item.images[0] }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.postContent}>
          <Text style={styles.postCaption}>{item.caption}</Text>
          
          {item.location && (
            <View style={styles.postLocation}>
              <MaterialCommunityIcons name="map-marker" size={14} color="#757575" />
              <Text style={styles.locationText}>{item.location}</Text>
            </View>
          )}
          
          <View style={styles.postStats}>
            <View style={styles.postStat}>
              <MaterialCommunityIcons name="heart" size={16} color="#F44336" />
              <Text style={styles.statText}>{item.likes}</Text>
            </View>
            
            <View style={styles.postStat}>
              <MaterialCommunityIcons name="comment" size={16} color="#2196F3" />
              <Text style={styles.statText}>{item.comments}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };
  
  // Render empty state
  const renderEmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="image-multiple" size={48} color="#BDBDBD" />
        <Text style={styles.emptyText}>No posts yet</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={profile?.name || username || 'User Profile'} />
        <Appbar.Action icon="dots-vertical" onPress={() => {}} />
      </Appbar.Header>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : (
        <FlatList
          data={currentTab === 'posts' ? posts : []}
          renderItem={renderPostItem}
          keyExtractor={item => item.id}
          ListHeaderComponent={renderProfileHeader}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#2196F3"]}
            />
          }
          contentContainerStyle={
            posts.length === 0 ? { flexGrow: 1 } : styles.listContent
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    backgroundColor: 'white',
    paddingBottom: 16,
  },
  coverPhotoContainer: {
    height: 150,
    backgroundColor: '#E0E0E0',
  },
  coverPhoto: {
    height: '100%',
    width: '100%',
  },
  profileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: -30,
  },
  avatar: {
    borderWidth: 3,
    borderColor: 'white',
  },
  nameContainer: {
    flex: 1,
    marginLeft: 16,
    marginTop: 30,
  },
  displayName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 14,
    color: '#757575',
  },
  followButton: {
    marginTop: 30,
  },
  bio: {
    paddingHorizontal: 16,
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
  },
  profileDetails: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    marginRight: 8,
  },
  selectedTab: {
    backgroundColor: '#E3F2FD',
  },
  selectedTabText: {
    color: '#2196F3',
  },
  listContent: {
    paddingBottom: 16,
  },
  postItem: {
    backgroundColor: 'white',
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 200,
  },
  postContent: {
    padding: 16,
  },
  postCaption: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  postLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  }
});

export default UserProfileScreen;