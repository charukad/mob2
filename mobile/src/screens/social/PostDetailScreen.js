import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import {
  Appbar,
  Text,
  Divider,
  Button,
  Avatar,
  Portal,
  Dialog,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

// Import components
import CommentItem from '../../components/social/CommentItem';
import ProfileAvatar from '../../components/common/ProfileAvatar';

// Import redux actions
import {
  fetchPostById,
  likePost,
  savePost,
  deletePost,
  createComment,
  fetchComments,
  likeComment,
  deleteComment,
} from '../../store/slices/socialSlice';
import { logout } from '../../store/slices/authSlice';

// Import utilities and constants
import { COLORS, FONTS } from '../../constants/theme';
import { getAvatarUrl } from '../../utils/profileUtils';

const { width } = Dimensions.get('window');

const PostDetailScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { postId, focusComment } = route.params;
  const { currentPost, comments, loading, commentLoading } = useSelector(state => state.social);
  const { user } = useSelector(state => state.auth);
  
  const [commentText, setCommentText] = useState('');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleteCommentDialogVisible, setDeleteCommentDialogVisible] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [posterAvatarUrl, setPosterAvatarUrl] = useState(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState(null);
  
  // Input ref for focusing comment field
  const commentInputRef = React.useRef(null);
  
  // Fetch post and comments
  useFocusEffect(
    useCallback(() => {
      console.log('Fetching post with ID:', postId);
      dispatch(fetchPostById(postId));
      dispatch(fetchComments(postId));
    }, [dispatch, postId])
  );
  
  // Focus comment input if requested
  useEffect(() => {
    if (focusComment && commentInputRef.current) {
      setTimeout(() => {
        commentInputRef.current.focus();
      }, 500);
    }
  }, [focusComment]);
  
  // Load avatar URLs when component mounts or post/user changes
  useEffect(() => {
    const loadAvatars = async () => {
      if (currentPost?.user?.email) {
        const url = await getAvatarUrl(currentPost.user);
        setPosterAvatarUrl(url);
      }
      
      if (user?.email) {
        const url = await getAvatarUrl(user);
        setUserAvatarUrl(url);
      }
    };
    
    if (currentPost || user) {
      loadAvatars();
    }
  }, [currentPost, user]);
  
  // Add new debugging useEffect
  useEffect(() => {
    if (currentPost) {
      console.log('Current post user data:', JSON.stringify({
        id: currentPost._id,
        user: currentPost.user ? {
          id: currentPost.user._id,
          name: currentPost.user.name,
          firstName: currentPost.user.firstName,
          lastName: currentPost.user.lastName,
          email: currentPost.user.email,
          profileImage: currentPost.user.profileImage
        } : null
      }, null, 2));
    }
  }, [currentPost]);
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    const postDate = new Date(date);
    return format(postDate, 'MMMM d, yyyy h:mm a');
  };
  
  // Handle post interactions
  const handleLike = () => {
    dispatch(likePost(postId));
  };
  
  const handleSave = () => {
    dispatch(savePost(postId));
  };
  
  const handleShare = () => {
    // Share functionality to be implemented
    Alert.alert('Share', 'Sharing functionality coming soon!');
  };
  
  const handleDeletePost = () => {
    setDeleteDialogVisible(true);
  };
  
  const confirmDeletePost = () => {
    dispatch(deletePost(postId)).unwrap()
      .then(() => {
        setDeleteDialogVisible(false);
        navigation.goBack();
      })
      .catch(error => {
        console.error('Error deleting post:', error);
        Alert.alert('Error', 'Failed to delete post. Please try again.');
      });
  };
  
  // Handle comment interactions
  const handleAddComment = () => {
    if (!commentText.trim()) return;
    
    // Check if user is authenticated
    if (!user || !user.id) {
      Alert.alert(
        'Authentication Required',
        'Please log in to comment on posts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Log In', 
            onPress: () => {
              // Dispatch logout action to redirect to auth flow
              dispatch(logout());
            } 
          }
        ]
      );
      return;
    }
    
    // Set loading state
    const tempComment = commentText;
    setCommentText('');
    
    dispatch(createComment({ postId, content: tempComment }))
      .unwrap()
      .then(() => {
        // Success - comment added
        console.log('Comment added successfully');
      })
      .catch(error => {
        console.error('Error adding comment:', error);
        // Restore the comment text so user doesn't lose their input
        setCommentText(tempComment);
        
        // Handle authentication errors specifically
        if (error.message && (
            error.message.includes('session has expired') || 
            error.message.includes('not authorized') ||
            error.message.includes('Authentication required'))) {
          
          Alert.alert(
            'Authentication Error',
            'Your session has expired. Please log in again to comment.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Log In', 
                onPress: () => {
                  // Dispatch logout action to redirect to auth flow
                  dispatch(logout());
                }
              }
            ]
          );
        } else {
          // Generic error
          Alert.alert(
            'Error', 
            error.message || 'Failed to add comment. Please try again.'
          );
        }
      });
  };
  
  const handleLikeComment = (commentId) => {
    console.log('Post ID of comment being liked:', postId);
    console.log('Post internal ID:', currentPost?._id);
    console.log('Post unique ID:', currentPost?.postId);
    dispatch(likeComment({ postId, commentId }));
  };
  
  const handleReplyToComment = (commentId) => {
    console.log('Post ID of comment being replied to:', postId);
    console.log('Post internal ID:', currentPost?._id);
    console.log('Post unique ID:', currentPost?.postId);
    // Reply functionality to be implemented
    // For now, just focus the comment input
    if (commentInputRef.current) {
      commentInputRef.current.focus();
    }
  };
  
  const handleDeleteComment = (commentId) => {
    console.log('Post ID of comment being deleted:', postId);
    console.log('Post internal ID:', currentPost?._id);
    console.log('Post unique ID:', currentPost?.postId);
    setCommentToDelete(commentId);
    setDeleteCommentDialogVisible(true);
  };
  
  const confirmDeleteComment = () => {
    if (commentToDelete) {
      dispatch(deleteComment({ postId, commentId: commentToDelete }))
        .unwrap()
        .then(() => {
          setDeleteCommentDialogVisible(false);
          setCommentToDelete(null);
        })
        .catch(error => {
          console.error('Error deleting comment:', error);
          Alert.alert('Error', 'Failed to delete comment. Please try again.');
        });
    }
  };
  
  // Handle image navigation
  const handleNextImage = () => {
    if (currentPost?.images && currentPost.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % currentPost.images.length);
    }
  };
  
  const handlePreviousImage = () => {
    if (currentPost?.images && currentPost.images.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? currentPost.images.length - 1 : prev - 1
      );
    }
  };
  
  // Handle navigation to user profile
  const handleViewUserProfile = () => {
    if (currentPost?.user) {
      navigation.navigate('UserProfile', { userId: currentPost.user?._id });
    }
  };
  
  // Handle navigation to location
  const handleViewLocation = () => {
    if (currentPost?.location?._id) {
      navigation.navigate('LocationDetail', { locationId: currentPost.location?._id });
    }
  };
  
  if (loading && !currentPost) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }
  
  if (!currentPost) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>Post not found</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }
  
  const isOwner = currentPost.user?._id === user?._id;
  
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Post" />
          {isOwner ? (
            <>
              <Appbar.Action icon="pencil" onPress={() => navigation.navigate('EditPost', { postId })} />
              <Appbar.Action icon="delete" onPress={handleDeletePost} />
            </>
          ) : (
            <Appbar.Action
              icon={currentPost.isSaved ? "bookmark" : "bookmark-outline"}
              onPress={handleSave}
            />
          )}
        </Appbar.Header>
        
        <FlatList
          data={comments}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={() => (
            <View>
              {/* Post Header */}
              <View style={styles.postHeader}>
                <TouchableOpacity onPress={handleViewUserProfile} style={styles.userInfo}>
                  <ProfileAvatar user={currentPost?.user} size={40} />
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.userName}>
                      {currentPost.user?.name || 
                       (currentPost.user?.firstName && currentPost.user?.lastName ? 
                        `${currentPost.user.firstName} ${currentPost.user.lastName}` : 
                        (currentPost.user?.email ? 
                         currentPost.user.email.split('@')[0] : 
                         'Unknown User'))}
                    </Text>
                    <Text style={styles.postTime}>{formatDate(currentPost.createdAt)}</Text>
                  </View>
                </TouchableOpacity>
                
                {currentPost.location && (
                  <TouchableOpacity onPress={handleViewLocation} style={styles.locationContainer}>
                    <MaterialCommunityIcons name="map-marker" size={16} color={COLORS.primary} />
                    <Text style={styles.locationText}>{currentPost.location?.name}</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Post Content */}
              {currentPost.content && (
                <Text style={styles.content}>{currentPost.content}</Text>
              )}
              
              {/* Post Images */}
              {currentPost.images && currentPost.images.length > 0 && (
                <View style={styles.imageOuterContainer}>
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: currentPost.images[currentImageIndex] }}
                      style={styles.image}
                      resizeMode="cover"
                      defaultSource={require('../../../assets/placeholder-image.jpg')}
                    />
                    
                    {currentPost.images.length > 1 && (
                      <>
                        <TouchableOpacity
                          style={[styles.imageNavButton, styles.imageNavLeft]}
                          onPress={handlePreviousImage}
                        >
                          <MaterialCommunityIcons name="chevron-left" size={24} color={COLORS.white} />
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.imageNavButton, styles.imageNavRight]}
                          onPress={handleNextImage}
                        >
                          <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.white} />
                        </TouchableOpacity>
                        
                        <View style={styles.imageIndicators}>
                          {currentPost.images.map((_, index) => (
                            <View
                              key={`indicator-${index}`}
                              style={[
                                styles.imageIndicator,
                                index === currentImageIndex && styles.imageIndicatorActive
                              ]}
                            />
                          ))}
                        </View>
                      </>
                    )}
                  </View>
                </View>
              )}
              
              {/* Interaction Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.stat}>
                  <MaterialCommunityIcons name="heart" size={14} color={COLORS.gray} />
                  <Text style={styles.statText}>{currentPost.likesCount || 0} likes</Text>
                </View>
                
                <View style={styles.stat}>
                  <MaterialCommunityIcons name="comment" size={14} color={COLORS.gray} />
                  <Text style={styles.statText}>{currentPost.commentsCount || 0} comments</Text>
                </View>
              </View>
              
              <Divider />
              
              {/* Interaction Buttons */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleLike}
                >
                  <MaterialCommunityIcons
                    name={currentPost.isLiked ? "heart" : "heart-outline"}
                    size={22}
                    color={currentPost.isLiked ? COLORS.error : COLORS.gray}
                  />
                  <Text style={[
                    styles.actionText,
                    currentPost.isLiked && { color: COLORS.error }
                  ]}>
                    Like
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => commentInputRef.current?.focus()}
                >
                  <MaterialCommunityIcons name="comment-outline" size={22} color={COLORS.gray} />
                  <Text style={styles.actionText}>Comment</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleShare}
                >
                  <MaterialCommunityIcons name="share-outline" size={22} color={COLORS.gray} />
                  <Text style={styles.actionText}>Share</Text>
                </TouchableOpacity>
              </View>
              
              <Divider />
              
              {/* Comments Header */}
              <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle}>Comments</Text>
              </View>
            </View>
          )}
          renderItem={({ item }) => (
            <CommentItem
              comment={item}
              onLike={() => handleLikeComment(item._id)}
              onReply={() => handleReplyToComment(item._id)}
              onDelete={() => handleDeleteComment(item._id)}
              isOwner={item.user?._id === user?._id}
              postId={currentPost?.postId || postId}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyCommentsContainer}>
              <MaterialCommunityIcons name="comment-outline" size={48} color={COLORS.lightGray} />
              <Text style={styles.emptyCommentsText}>No comments yet. Be the first to comment!</Text>
            </View>
          }
          ListFooterComponent={
            commentLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={styles.commentsLoading} />
            ) : null
          }
        />
        
        {/* Comment Input */}
        <View style={styles.commentInputContainer}>
          <ProfileAvatar user={user} size={32} />
          <TextInput
            ref={commentInputRef}
            style={styles.commentInput}
            placeholder="Write a comment..."
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!commentText.trim() || commentLoading) && styles.sendButtonDisabled
            ]}
            onPress={handleAddComment}
            disabled={!commentText.trim() || commentLoading}
          >
            {commentLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <MaterialCommunityIcons name="send" size={20} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
        
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
        
        {/* Delete Comment Dialog */}
        <Portal>
          <Dialog visible={deleteCommentDialogVisible} onDismiss={() => setDeleteCommentDialogVisible(false)}>
            <Dialog.Title>Delete Comment</Dialog.Title>
            <Dialog.Content>
              <Text>Are you sure you want to delete this comment? This action cannot be undone.</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setDeleteCommentDialogVisible(false)}>Cancel</Button>
              <Button onPress={confirmDeleteComment} color={COLORS.error}>Delete</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    ...FONTS.h3,
    color: COLORS.error,
    marginVertical: 16,
  },
  postHeader: {
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginLeft: 12,
  },
  userName: {
    ...FONTS.body3Bold,
  },
  postTime: {
    ...FONTS.body4,
    color: COLORS.gray,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationText: {
    ...FONTS.body4,
    color: COLORS.primary,
    marginLeft: 4,
  },
  content: {
    ...FONTS.body3,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  imageOuterContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: width * 0.7, // Aspect ratio 10:7
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageNavButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageNavLeft: {
    left: 8,
  },
  imageNavRight: {
    right: 8,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  imageIndicatorActive: {
    backgroundColor: COLORS.white,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionText: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginLeft: 4,
  },
  commentsHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  commentsTitle: {
    ...FONTS.h3,
  },
  emptyCommentsContainer: {
    alignItems: 'center',
    padding: 24,
  },
  emptyCommentsText: {
    ...FONTS.body3,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 12,
  },
  commentsLoading: {
    padding: 16,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
  },
  commentInput: {
    flex: 1,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 20,
    ...FONTS.body3,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
});

export default PostDetailScreen;