import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { FAB, Searchbar, Chip, Portal, Dialog, Button, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Import components
import PostCard from '../../components/social/PostCard';
import CreatePostButton from '../../components/social/CreatePostButton';
import EmptyState from '../../components/common/EmptyState';
import Header from '../../components/common/Header';

// Import redux actions
import {
  fetchPosts,
  likePost,
  savePost,
  deletePost,
} from '../../store/slices/socialSlice';

// Import theme
import { COLORS } from '../../constants/theme';

// Import utils
import { 
  getProfileImageByEmail, 
  resetProfileImageCache, 
  clearProfileImageCache,
  getProfileImageFromGlobal 
} from '../../utils/profileUtils';

const FeedScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { posts, loading, refreshing, hasMore } = useSelector(state => state.social);
  const { user } = useSelector(state => state.auth);
  
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  
  // Debug log when posts change
  useEffect(() => {
    console.log(`[FeedScreen] Got ${posts?.length || 0} posts, loading: ${loading}, refreshing: ${refreshing}`);
    if (posts?.length > 0) {
      console.log(`[FeedScreen] First post author: ${posts[0]?.user?.name || 'Unknown'}, has image: ${Boolean(posts[0]?.user?.profileImage || posts[0]?.user?.avatar)}`);
    }
  }, [posts, loading, refreshing]);
  
  // Fetch posts when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('[FeedScreen] Screen focused, loading initial posts with filter:', activeFilter);
      // Clear profile image cache to force fresh images
      clearProfileImageCache();
      loadInitialPosts();
      
      // Force refresh user avatars in all posts
      const refreshAvatars = async () => {
        if (posts && posts.length > 0) {
          for (const post of posts) {
            if (post?.user?.email) {
              // Force fetch fresh images from server by bypassing cache
              await getProfileImageFromGlobal(post.user.email);
            }
          }
        }
      };
      
      refreshAvatars();
    }, [activeFilter])
  );

  // Load initial posts
  const loadInitialPosts = () => {
    console.log('[FeedScreen] Loading initial posts with filter:', activeFilter);
    dispatch(fetchPosts({ filter: activeFilter, page: 1, limit: 10, refresh: true }));
  };
  
  // Handle load more posts
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      console.log('[FeedScreen] Loading more posts...');
      dispatch(fetchPosts({ filter: activeFilter }));
    }
  };
  
  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    console.log('[FeedScreen] Refreshing feed...');
    loadInitialPosts();
  }, [activeFilter]);
  
  // Handle post interaction
  const handleLike = (postId) => {
    console.log('Liking post:', postId);
    dispatch(likePost(postId));
  };
  
  const handleComment = (postId) => {
    console.log('Opening comments for post:', postId);
    navigation.navigate('PostDetail', { postId, focusComment: true });
  };
  
  const handleShare = (postId) => {
    console.log('Sharing post:', postId);
    // Share functionality to be implemented
    Alert.alert('Share', 'Sharing functionality coming soon!');
  };
  
  const handleSave = (postId) => {
    dispatch(savePost(postId));
  };
  
  // Handle post deletion
  const handleDeletePost = (postId) => {
    setPostToDelete(postId);
    setDeleteDialogVisible(true);
  };
  
  const confirmDeletePost = () => {
    if (postToDelete) {
      dispatch(deletePost(postToDelete));
      setDeleteDialogVisible(false);
      setPostToDelete(null);
    }
  };
  
  // Filter functions
  const handleFilterChange = (filter) => {
    console.log('[FeedScreen] Changing filter to:', filter);
    setActiveFilter(filter);
    dispatch(fetchPosts({ filter, page: 1, limit: 10, refresh: true }));
  };
  
  // Handle search
  const handleSearch = () => {
    if (searchQuery.trim()) {
      console.log('[FeedScreen] Searching for:', searchQuery);
      // Implement search functionality
      Alert.alert('Search', `Search functionality coming soon! Query: ${searchQuery}`);
    }
  };
  
  // Preload profile images for all posts
  useEffect(() => {
    const preloadProfileImages = async () => {
      if (!posts || posts.length === 0) return;
      
      // Process each post's user to preload their avatar
      for (const post of posts) {
        if (post?.user?.email) {
          try {
            // Check if the user has a real profile image vs a fallback avatar
            const hasRealProfileImage = 
              post.user.profileImage && 
              !post.user.profileImage.includes('ui-avatars.com');
              
            const hasRealAvatar = 
              post.user.avatar && 
              !post.user.avatar.includes('ui-avatars.com');
            
            // If the user has a fallback image, try to get a real one
            if (!hasRealProfileImage && !hasRealAvatar) {
              // Fetch from the profile image cache for consistent behavior
              await getProfileImageByEmail(post.user.email);
            }
          } catch (error) {
            console.error(`Error preloading profile image:`, error);
          }
        }
      }
    };
    
    preloadProfileImages();
  }, [posts]);
  
  // Render post item
  const renderPostItem = ({ item }) => {
    if (!item) {
      console.warn('Attempted to render null post item');
      return null;
    }
    
    return (
      <PostCard
        post={item}
        onLike={handleLike}
        onComment={handleComment}
        onShare={handleShare}
        onSave={handleSave}
        onDelete={handleDeletePost}
        isSaved={item.isSaved}
        isOwner={user?._id === item.user?._id}
        navigation={navigation}
      />
    );
  };
  
  // Render empty state
  const renderEmptyState = () => {
    if (loading && posts.length === 0) return null;
    
    return (
      <EmptyState
        icon="post"
        title="No posts found"
        message={
          activeFilter !== 'all'
            ? "Try changing your filters or follow more users"
            : "Start by creating your first post or following other travelers"
        }
        actionLabel="Create Post"
        onAction={() => navigation.navigate('CreatePost')}
      />
    );
  };

  // Render footer loading indicator
  const renderFooter = () => {
    if (!loading || !hasMore) return null;
    return (
      <ActivityIndicator
        color={COLORS.primary}
        size="large"
        style={styles.loadingFooter}
      />
    );
  };
  
  return (
    <View style={styles.container}>
      <Header title="Travel Feed" />
      
      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <Searchbar
          placeholder="Search posts"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          onSubmitEditing={handleSearch}
        />
      </View>
      
      {/* Filters */}
      <View style={styles.filterContainer}>
        <Chip
          selected={activeFilter === 'all'}
          onPress={() => handleFilterChange('all')}
          style={styles.filterChip}
          selectedColor={COLORS.primary}
        >
          All Posts
        </Chip>
        <Chip
          selected={activeFilter === 'following'}
          onPress={() => handleFilterChange('following')}
          style={styles.filterChip}
          selectedColor={COLORS.primary}
        >
          Following
        </Chip>
        <Chip
          selected={activeFilter === 'trending'}
          onPress={() => handleFilterChange('trending')}
          style={styles.filterChip}
          selectedColor={COLORS.primary}
        >
          Trending
        </Chip>
        <Chip
          selected={activeFilter === 'nearby'}
          onPress={() => handleFilterChange('nearby')}
          style={styles.filterChip}
          selectedColor={COLORS.primary}
        >
          Nearby
        </Chip>
      </View>
      
      {/* Create Post Button */}
      <CreatePostButton user={user} />
      
      {/* Posts List */}
      <FlatList
        data={posts}
        renderItem={renderPostItem}
        keyExtractor={item => item?._id || `post-${Math.random().toString(36).substr(2, 9)}`}
        contentContainerStyle={[
          styles.listContainer, 
          posts.length === 0 && styles.emptyList
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
      />
      
      {/* FAB for creating post */}
      <FAB
        style={styles.fab}
        icon="plus"
        label="Post"
        onPress={() => navigation.navigate('CreatePost')}
        color={COLORS.white}
      />
      
      {/* Delete Post Dialog */}
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Post</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete this post? This action cannot be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={confirmDeletePost} color={COLORS.error}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
  },
  searchBar: {
    elevation: 2,
    borderRadius: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  filterChip: {
    marginRight: 8,
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 80, // Extra padding for FAB
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingFooter: {
    paddingVertical: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
  },
});

export default FeedScreen;