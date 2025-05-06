import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../api/axiosConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../../constants/api';

// Async thunks
export const fetchPosts = createAsyncThunk(
  'social/fetchPosts',
  async ({ filter = 'all', page = 1, limit = 10, refresh = false }, { rejectWithValue, getState }) => {
    try {
      const url = filter === 'all' 
        ? `${API_ENDPOINTS.SOCIAL.POSTS.LIST}`
        : filter === 'following'
          ? `${API_ENDPOINTS.SOCIAL.POSTS.FEED}`
          : filter === 'trending'
            ? `${API_ENDPOINTS.SOCIAL.POSTS.TRENDING}`
            : `${API_ENDPOINTS.SOCIAL.POSTS.NEARBY}`;
      
      // If not refreshing, use the current page from state
      const currentPage = !refresh ? getState().social.currentPage : 1;
      
      // Get auth token from state
      const token = getState().auth.token;
      
      // For authenticated endpoints like 'following', we need the token
      const headers = {};
      if (token && (filter === 'following' || filter === 'saved')) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log(`Fetching posts from ${url} with page=${currentPage}, limit=${limit}`);
      const response = await axios.get(url, {
        params: { page: currentPage, limit },
        headers
      });
      
      console.log('Response structure:', JSON.stringify(response.data));
      
      // Handle and transform the response data
      let postsArray = [];
      
      // Check for the expected response structure
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // API is returning { data: [], pagination: {}, success: true }
        postsArray = response.data.data;
        console.log(`Received ${postsArray.length} posts`);
      } else if (Array.isArray(response.data)) {
        // Directly got an array
        postsArray = response.data;
        console.log(`Received ${postsArray.length} posts as direct array`);
      } else {
        // Unexpected format - log detailed info for debugging
        console.error('Unexpected API response format for posts:', 
          typeof response.data, 
          Object.keys(response.data || {}),
          JSON.stringify(response.data)
        );
        postsArray = [];
      }
      
      // Normalize the posts data
      const normalizedPosts = await Promise.all(postsArray.map(async post => {
        // Prepare normalized user object
        let normalizedUser = null;
        
        // Log the raw user object for debugging
        console.log('Raw post user object:', JSON.stringify(post.user));
        
        if (post.user) {
          // Keep all original fields from the user object
          normalizedUser = {...post.user};
          
          // Ensure core fields are always present with fallbacks
          normalizedUser._id = post.user._id || 'unknown';
          
          // Handle name with different variations
          if (!normalizedUser.name && (post.user.firstName || post.user.lastName)) {
            normalizedUser.name = `${post.user.firstName || ''} ${post.user.lastName || ''}`.trim();
          } else if (!normalizedUser.name) {
            normalizedUser.name = 'Unknown User';
          }
          
          // Keep email if it exists
          normalizedUser.email = post.user.email || '';
          
          // Ensure profileImage is available from any source
          if (!normalizedUser.profileImage) {
            normalizedUser.profileImage = post.user.avatar || 
                                         post.user.image || 
                                         (post.user.profile?.avatar) || 
                                         (post.user.profile?.profileImage) ||
                                         null;
          }
          
          // If user has email but no valid profile image, attempt to get it from ProfileImage model
          if (normalizedUser.email && 
              (!normalizedUser.profileImage || normalizedUser.profileImage.includes('ui-avatars.com'))) {
            try {
              // First check AsyncStorage
              const cachedImage = await AsyncStorage.getItem(`profile_image_${normalizedUser.email}`);
              
              if (cachedImage && !cachedImage.includes('ui-avatars.com')) {
                console.log('Using cached profile image for post user:', normalizedUser.email);
                normalizedUser.profileImage = cachedImage;
              } else {
                // Try to get from API with a short timeout to avoid delaying the UI
                const token = getState().auth.token;
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                
                try {
                  const profileImageResponse = await axios.get(
                    API_ENDPOINTS.PROFILE.PROFILE_IMAGE_BY_EMAIL(normalizedUser.email),
                    { 
                      headers,
                      timeout: 5000 // 5 second timeout to keep UI responsive
                    }
                  );
                  
                  if (profileImageResponse.data?.success && 
                      profileImageResponse.data?.data?.profileImage) {
                    
                    const imageUrl = profileImageResponse.data.data.profileImage;
                    console.log('Found profile image for post user:', normalizedUser.email);
                    normalizedUser.profileImage = imageUrl;
                    
                    // Cache for future use
                    try {
                      await AsyncStorage.setItem(`profile_image_${normalizedUser.email}`, imageUrl);
                    } catch (storageError) {
                      console.log('Error storing profile image in AsyncStorage:', storageError);
                    }
                  }
                } catch (apiError) {
                  console.log('Error fetching profile image for post user:', apiError.message);
                  // Continue without image - will use fallback later
                }
              }
            } catch (error) {
              console.log('Error handling profile image for post user:', error.message);
            }
          }
          
          // Log normalized user details for debugging
          console.log('Normalized user for post:', {
            id: normalizedUser._id,
            name: normalizedUser.name,
            email: normalizedUser.email,
            profileImage: normalizedUser.profileImage, 
            firstName: normalizedUser.firstName,
            lastName: normalizedUser.lastName,
            postId: post._id
          });
        } else {
          normalizedUser = {
            _id: 'unknown',
            name: 'Unknown User',
            profileImage: null
          };
        }
        
        // Ensure each post has required fields with defaults
        return {
          _id: post._id || `temp-${Math.random().toString(36).substr(2, 9)}`,
          content: post.content || '',
          createdAt: post.createdAt || new Date().toISOString(),
          images: Array.isArray(post.images) ? post.images : [],
          likesCount: post.likesCount || 0,
          commentsCount: post.commentsCount || 0,
          isLiked: !!post.isLiked,
          isSaved: !!post.isSaved,
          user: normalizedUser,
          location: post.location || null
        };
      }));
      
      return { data: normalizedPosts, refresh, filter };
    } catch (error) {
      console.error('Error fetching posts:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data));
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error details:', error);
      }
      return rejectWithValue({
        message: error.message || 'Failed to fetch posts',
        status: error.response?.status,
        data: error.response?.data
      });
    }
  }
);

export const fetchPostById = createAsyncThunk(
  'social/fetchPostById',
  async (postId, { rejectWithValue }) => {
    try {
      console.log(`Fetching post details for ID: ${postId}`);
      const response = await axios.get(`${API_ENDPOINTS.SOCIAL.POSTS.DETAILS(postId)}`);
      console.log('Post details response:', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      console.error(`Error fetching post ${postId}:`, error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data));
      }
      return rejectWithValue({
        message: error.message || 'Failed to fetch post details',
        status: error.response?.status,
        data: error.response?.data
      });
    }
  }
);

export const createPost = createAsyncThunk(
  'social/createPost',
  async (postData, { rejectWithValue, getState }) => {
    try {
      // Log the FormData for debugging
      console.log('Creating post with FormData...');
      
      // Debug FormData contents
      if (postData instanceof FormData) {
        const formDataEntries = {};
        for (const pair of postData.entries()) {
          const [key, value] = pair;
          if (typeof value === 'object' && value.uri) {
            // It's likely a file
            formDataEntries[key] = {
              name: value.name,
              type: value.type,
              uri: value.uri
            };
          } else {
            formDataEntries[key] = value;
          }
        }
        console.log('FormData contents:', JSON.stringify(formDataEntries));
      }
      
      // Get auth token from state
      let token = getState().auth.token;
      
      // If token is not in Redux state, try to get it directly from AsyncStorage
      if (!token) {
        console.log('Token not found in Redux state, checking AsyncStorage directly');
        token = await AsyncStorage.getItem('authToken');
        
        if (!token) {
          throw new Error('Authentication required. Please log in.');
        }
        
        console.log('Token found in AsyncStorage, proceeding with request');
      }
      
      console.log('Sending post request to:', API_ENDPOINTS.SOCIAL.POSTS.CREATE);
      console.log('Using auth token for request:', token.substring(0, 10) + '...');
      
      // Use the correct content type for multipart/form-data
      const response = await axios.post(API_ENDPOINTS.SOCIAL.POSTS.CREATE, postData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        // Prevent axios from trying to JSON.stringify the FormData
        transformRequest: (data) => data
      });
      
      console.log('Post creation successful, response:', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      console.error('Failed to create post:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data));
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error details:', error);
      }
      return rejectWithValue({
        message: error.message || 'Failed to create post',
        status: error.response?.status,
        data: error.response?.data
      });
    }
  }
);

export const updatePost = createAsyncThunk(
  'social/updatePost',
  async ({ postId, postData }, { rejectWithValue, getState }) => {
    try {
      // Get auth token from state
      const token = getState().auth.token;
      
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }
      
      const response = await axios.put(`${API_ENDPOINTS.SOCIAL.POSTS.UPDATE(postId)}`, postData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to update post' });
    }
  }
);

export const deletePost = createAsyncThunk(
  'social/deletePost',
  async (postId, { rejectWithValue, getState }) => {
    try {
      // Get auth token from state
      const token = getState().auth.token;
      
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }
      
      await axios.delete(`${API_ENDPOINTS.SOCIAL.POSTS.DELETE(postId)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return postId;
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to delete post' });
    }
  }
);

export const likePost = createAsyncThunk(
  'social/likePost',
  async (postId, { rejectWithValue, getState }) => {
    try {
      // Get auth token from state
      const token = getState().auth.token;
      
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }
      
      const response = await axios.post(`${API_ENDPOINTS.SOCIAL.POSTS.LIKE(postId)}`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Return the full response data which includes likesCount
      return { 
        postId, 
        liked: response.data.data.liked,
        likesCount: response.data.data.likesCount
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to like post' });
    }
  }
);

export const savePost = createAsyncThunk(
  'social/savePost',
  async (postId, { rejectWithValue, getState }) => {
    try {
      // Get auth token from state
      const token = getState().auth.token;
      
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }
      
      const response = await axios.post(`${API_ENDPOINTS.SOCIAL.POSTS.SAVE(postId)}`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return { postId, saved: response.data.saved };
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to save post' });
    }
  }
);

export const fetchComments = createAsyncThunk(
  'social/fetchComments',
  async (postId, { rejectWithValue, getState }) => {
    try {
      console.log(`Fetching comments for post ID: ${postId}`);
      const response = await axios.get(`${API_ENDPOINTS.SOCIAL.POSTS.COMMENTS(postId)}`);
      console.log('Comments response:', JSON.stringify(response.data).substring(0, 200) + '...');
      
      // Get auth token for authenticated requests
      const token = getState().auth.token;
      
      // Handle different response structures
      let commentsData = [];
      if (response.data && response.data.data) {
        commentsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        commentsData = response.data;
      } else {
        console.warn('Unexpected comments response format:', response.data);
        commentsData = [];
      }
      
      // Store emails we've already processed to avoid duplicate API calls
      const processedEmails = new Map();
      
      // Process each comment to ensure user data is complete
      const updatedCommentsData = await Promise.all(commentsData.map(async comment => {
        if (comment.user) {
          // Format user name if needed
          if (!comment.user.name && (comment.user.firstName || comment.user.lastName)) {
            comment.user.name = `${comment.user.firstName || ''} ${comment.user.lastName || ''}`.trim();
          }
          
          // If user has an email but no profile image, try to fetch it
          if (comment.user.email && 
              (!comment.user.profileImage || comment.user.profileImage.includes('ui-avatars.com'))) {
            
            const userEmail = comment.user.email;
            
            // Check if we've already processed this email
            if (!processedEmails.has(userEmail)) {
              try {
                console.log(`Directly fetching profile image for comment user: ${userEmail}`);
                
                const profileImageResponse = await axios.get(
                  API_ENDPOINTS.PROFILE.PROFILE_IMAGE_BY_EMAIL(userEmail),
                  {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                  }
                );
                
                // Check for different response structures
                if (profileImageResponse.data?.success && 
                    profileImageResponse.data?.data?.profileImage) {
                  
                  // Store the image URL for this email
                  const imageUrl = profileImageResponse.data.data.profileImage;
                  processedEmails.set(userEmail, imageUrl);
                  console.log(`Found profile image for ${userEmail}:`, imageUrl);
                  
                  // Store in AsyncStorage for immediate access in UI
                  try {
                    await AsyncStorage.setItem(`profile_image_${userEmail}`, imageUrl);
                    console.log(`Stored profile image in AsyncStorage for: ${userEmail}`);
                  } catch (storageError) {
                    console.log('Error storing profile image in AsyncStorage:', storageError);
                  }
                } else {
                  // Store null to indicate we checked but found nothing
                  processedEmails.set(userEmail, null);
                  console.log(`No profile image found for ${userEmail}`);
                }
              } catch (error) {
                console.log(`Could not fetch profile image for ${userEmail}:`, error.message);
                // Store null to indicate we tried but failed
                processedEmails.set(userEmail, null);
              }
            }
            
            // Set the profile image if we found one
            if (processedEmails.get(userEmail)) {
              comment.user.profileImage = processedEmails.get(userEmail);
            }
          }
          
          // Ensure profile image as fallback
          if (!comment.user.profileImage) {
            const name = comment.user.name || 
                        `${comment.user.firstName || ''} ${comment.user.lastName || ''}`.trim() || 
                        (comment.user.email ? comment.user.email.split('@')[0] : 'U');
            comment.user.profileImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
          }
        }
        return comment;
      }));
      
      return { postId, comments: updatedCommentsData };
    } catch (error) {
      console.error(`Error fetching comments for post ${postId}:`, error.message);
      return rejectWithValue(error.response?.data || { message: 'Failed to fetch comments' });
    }
  }
);

export const createComment = createAsyncThunk(
  'social/createComment',
  async ({ postId, content }, { rejectWithValue, getState, dispatch }) => {
    try {
      // Get auth token from state
      const token = getState().auth.token;
      
      // Enhanced error handling for authentication issues
      if (!token) {
        console.log('Authentication required - no token found');
        return rejectWithValue({ message: 'Authentication required. Please log in.' });
      }
      
      console.log(`Creating comment for post ${postId} with token: ${token.substring(0, 10)}...`);
      
      // First get the user's profile image from ProfileImage model if available
      let userEmail = getState().auth.user?.email;
      let userProfileImage = null;
      
      if (userEmail) {
        try {
          // Get profile image for the user based on email
          console.log('Attempting to fetch profile image for comment author email:', userEmail);
          const profileImageResponse = await axios.get(
            API_ENDPOINTS.PROFILE.PROFILE_IMAGE_BY_EMAIL(userEmail),
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );
          
          if (profileImageResponse.data?.success && 
              profileImageResponse.data?.data?.profileImage) {
            userProfileImage = profileImageResponse.data.data.profileImage;
            console.log('Found profile image for comment author:', userProfileImage);
            
            // Store in AsyncStorage for immediate access in UI components
            try {
              await AsyncStorage.setItem(`profile_image_${userEmail}`, userProfileImage);
              console.log('Stored profile image in AsyncStorage for:', userEmail);
            } catch (storageError) {
              console.log('Error storing profile image in AsyncStorage:', storageError);
            }
          } else {
            console.log('Profile image response format unexpected:', 
                      JSON.stringify(profileImageResponse.data));
          }
        } catch (error) {
          console.log('Could not fetch profile image for comment author:', error.message);
          // Continue without the profile image - will fall back to defaults
        }
      }
      
      const response = await axios.post(
        `${API_ENDPOINTS.SOCIAL.POSTS.COMMENTS(postId)}`, 
        { content },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      console.log('Comment created successfully, response:', JSON.stringify(response.data));
      
      // Create a safe comment object with required fields
      let commentData = {};
      
      // Extract the comment data from response based on its structure
      if (response.data && response.data.data) {
        commentData = response.data.data;
        console.log('Comment data from response.data.data:', JSON.stringify(commentData));
      } else if (response.data && !response.data.data && response.data.success) {
        // Sometimes the response might have a different structure
        commentData = response.data;
        console.log('Comment data from response.data:', JSON.stringify(commentData));
      } else {
        console.warn('Unexpected comment response format:', JSON.stringify(response.data));
        // Create a minimal valid comment object to prevent errors
        commentData = {
          _id: `temp-${Date.now()}`,
          content: content,
          user: getState().auth.user || { name: 'User' },
          createdAt: new Date().toISOString(),
          likesCount: 0,
          isLiked: false
        };
      }
      
      // Add the profile image we retrieved if it's not already in the comment data
      if (userProfileImage && commentData.user) {
        if (!commentData.user.profileImage || 
            commentData.user.profileImage.includes('ui-avatars.com')) {
          commentData.user.profileImage = userProfileImage;
          console.log('Added profile image to comment data:', userProfileImage);
        }
      }
      
      return { 
        postId, 
        comment: commentData
      };
    } catch (error) {
      console.error('Error creating comment:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data));
      }
      
      // Handle authentication errors
      if (error.response && error.response.status === 401) {
        console.log('Authentication failed - token may be expired');
        return rejectWithValue({ message: 'Your session has expired. Please log in again.' });
      }
      
      return rejectWithValue(error.response?.data || { message: 'Failed to create comment' });
    }
  }
);

export const likeComment = createAsyncThunk(
  'social/likeComment',
  async ({ postId, commentId }, { rejectWithValue, getState }) => {
    try {
      // Get auth token from state
      const token = getState().auth.token;
      
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }
      
      const response = await axios.post(
        `${API_ENDPOINTS.SOCIAL.POSTS.LIKE_COMMENT(postId, commentId)}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return { 
        postId, 
        commentId, 
        liked: response.data.data.liked,
        likesCount: response.data.data.likesCount 
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to like comment' });
    }
  }
);

export const deleteComment = createAsyncThunk(
  'social/deleteComment',
  async ({ postId, commentId }, { rejectWithValue, getState }) => {
    try {
      // Get auth token from state
      const token = getState().auth.token;
      
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }
      
      await axios.delete(`${API_ENDPOINTS.SOCIAL.POSTS.COMMENT(postId, commentId)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return { postId, commentId };
    } catch (error) {
      return rejectWithValue(error.response?.data || { message: 'Failed to delete comment' });
    }
  }
);

// Helper function to update post in array
const updatePostInArray = (posts, postId, updateFunc) => {
  return posts.map(post => {
    if (post._id === postId) {
      return updateFunc(post);
    }
    return post;
  });
};

// Initial state
const initialState = {
  posts: [],
  currentPost: null,
  comments: [],
  loading: false,
  refreshing: false,
  error: null,
  errorDetails: null,
  currentPage: 1,
  hasMore: true,
  commentLoading: false,
  currentFilter: 'all',
};

// Slice
const socialSlice = createSlice({
  name: 'social',
  initialState,
  reducers: {
    clearCurrentPost: (state) => {
      state.currentPost = null;
    },
    clearComments: (state) => {
      state.comments = [];
    },
    resetSocialState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch posts
      .addCase(fetchPosts.pending, (state, action) => {
        const { refresh } = action.meta.arg;
        state.loading = true;
        state.refreshing = refresh || false;
        state.error = null;
        state.errorDetails = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        const { data, refresh, filter } = action.payload;
        
        if (refresh) {
          state.posts = data;
          state.currentPage = 2; // Next page would be 2
          state.currentFilter = filter;
        } else {
          // Only add unique posts
          const existingPostIds = new Set(state.posts.map(post => post._id));
          const newPosts = data.filter(post => !existingPostIds.has(post._id));
          
          state.posts = [...state.posts, ...newPosts];
          state.currentPage += 1;
        }
        
        state.hasMore = data.length >= (action.meta.arg.limit || 10);
        state.loading = false;
        state.refreshing = false;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = action.payload?.message || 'Failed to fetch posts';
        state.errorDetails = action.payload;
        console.log('Social state error details:', JSON.stringify(state.errorDetails));
      })
      
      // Fetch post by ID
      .addCase(fetchPostById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPostById.fulfilled, (state, action) => {
        console.log("Raw post data:", JSON.stringify(action.payload));
        
        // Ensure the post has complete user data 
        if (action.payload && action.payload.data) {
          const post = action.payload.data;
          
          // Format user data properly
          if (post.user) {
            // If user name isn't set but first/last name are available, create a name
            if (!post.user.name && (post.user.firstName || post.user.lastName)) {
              post.user.name = `${post.user.firstName || ''} ${post.user.lastName || ''}`.trim();
            }
            
            // Ensure user has a profile image
            if (!post.user.profileImage) {
              const firstName = post.user.firstName || '';
              const lastName = post.user.lastName || '';
              post.user.profileImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}+${encodeURIComponent(lastName)}&background=random&color=fff`;
            }
          }
          
          state.currentPost = post;
        } else {
          // Fallback to old behavior if structure is different
          state.currentPost = action.payload;
        }
        
        state.loading = false;
      })
      .addCase(fetchPostById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create post
      .addCase(createPost.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.errorDetails = null;
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.posts = [action.payload, ...state.posts];
        state.loading = false;
      })
      .addCase(createPost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to create post';
        state.errorDetails = action.payload;
        console.log('Post creation error details:', JSON.stringify(state.errorDetails));
      })
      
      // Update post
      .addCase(updatePost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePost.fulfilled, (state, action) => {
        state.posts = updatePostInArray(state.posts, action.payload._id, () => action.payload);
        
        if (state.currentPost && state.currentPost._id === action.payload._id) {
          state.currentPost = action.payload;
        }
        
        state.loading = false;
      })
      .addCase(updatePost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete post
      .addCase(deletePost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deletePost.fulfilled, (state, action) => {
        state.posts = state.posts.filter(post => post._id !== action.payload);
        
        if (state.currentPost && state.currentPost._id === action.payload) {
          state.currentPost = null;
        }
        
        state.loading = false;
      })
      .addCase(deletePost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Like post
      .addCase(likePost.fulfilled, (state, action) => {
        const { postId, liked, likesCount } = action.payload;
        
        state.posts = updatePostInArray(state.posts, postId, (post) => ({
          ...post,
          isLiked: liked,
          likesCount: likesCount
        }));
        
        if (state.currentPost && state.currentPost._id === postId) {
          state.currentPost = {
            ...state.currentPost,
            isLiked: liked,
            likesCount: likesCount
          };
        }
      })
      
      // Save post
      .addCase(savePost.fulfilled, (state, action) => {
        const { postId, saved } = action.payload;
        
        state.posts = updatePostInArray(state.posts, postId, (post) => ({
          ...post,
          isSaved: saved,
        }));
        
        if (state.currentPost && state.currentPost._id === postId) {
          state.currentPost = {
            ...state.currentPost,
            isSaved: saved,
          };
        }
      })
      
      // Fetch comments
      .addCase(fetchComments.pending, (state) => {
        state.commentLoading = true;
        state.error = null;
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        // Ensure we have a valid array of comments
        if (Array.isArray(action.payload.comments)) {
          state.comments = action.payload.comments;
        } else {
          console.error('Invalid comments data received:', action.payload.comments);
          state.comments = [];
        }
        state.commentLoading = false;
      })
      .addCase(fetchComments.rejected, (state, action) => {
        state.commentLoading = false;
        state.error = action.payload;
      })
      
      // Create comment
      .addCase(createComment.pending, (state) => {
        state.commentLoading = true;
        state.error = null;
      })
      .addCase(createComment.fulfilled, (state, action) => {
        console.log('Adding comment to state:', action.payload);
        const { postId, comment } = action.payload;
        
        try {
          // Safely check if comment is a valid object before using
          if (comment && typeof comment === 'object' && Object.keys(comment).length > 0) {
            // Ensure the comment has all required fields
            const safeComment = {
              _id: comment._id || `temp-${Date.now()}`,
              content: comment.content || '',
              createdAt: comment.createdAt || new Date().toISOString(),
              likesCount: comment.likesCount || 0,
              isLiked: !!comment.isLiked,
              user: comment.user || { name: 'User' }
            };
            
            // Add the comment to the beginning of the comments array
            state.comments = [safeComment, ...state.comments];
            
            // Update comment count in posts and current post
            state.posts = updatePostInArray(state.posts, postId, (post) => ({
              ...post,
              commentsCount: (post.commentsCount || 0) + 1,
            }));
            
            if (state.currentPost && state.currentPost._id === postId) {
              state.currentPost = {
                ...state.currentPost,
                commentsCount: (state.currentPost.commentsCount || 0) + 1,
              };
            }
          } else {
            console.error('Invalid comment data received:', comment);
          }
        } catch (error) {
          console.error('Error processing comment in reducer:', error);
        }
        
        state.commentLoading = false;
      })
      .addCase(createComment.rejected, (state, action) => {
        state.commentLoading = false;
        state.error = action.payload;
        console.error('Comment creation rejected:', action.payload);
      })
      
      // Like comment
      .addCase(likeComment.fulfilled, (state, action) => {
        const { commentId, liked, likesCount } = action.payload;
        
        state.comments = state.comments.map(comment => {
          if (comment._id === commentId) {
            return {
              ...comment,
              isLiked: liked,
              likesCount: likesCount
            };
          }
          return comment;
        });
      })
      
      // Delete comment
      .addCase(deleteComment.pending, (state) => {
        state.commentLoading = true;
        state.error = null;
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        const { postId, commentId } = action.payload;
        
        state.comments = state.comments.filter(comment => comment._id !== commentId);
        
        // Update comment count in posts and current post
        state.posts = updatePostInArray(state.posts, postId, (post) => ({
          ...post,
          commentsCount: Math.max((post.commentsCount || 1) - 1, 0),
        }));
        
        if (state.currentPost && state.currentPost._id === postId) {
          state.currentPost = {
            ...state.currentPost,
            commentsCount: Math.max((state.currentPost.commentsCount || 1) - 1, 0),
          };
        }
        
        state.commentLoading = false;
      })
      .addCase(deleteComment.rejected, (state, action) => {
        state.commentLoading = false;
        state.error = action.payload;
      });
  },
});

// Export actions and reducer
export const { clearCurrentPost, clearComments, resetSocialState } = socialSlice.actions;
export default socialSlice.reducer;

// Add this function at the end of the file to help with debugging
export const checkAuthToken = () => (dispatch, getState) => {
  try {
    const token = getState().auth.token;
    console.log('Current auth token status:', token ? 'Present' : 'Missing');
    if (token) {
      // Log first few characters for debugging (don't log full token for security)
      console.log('Token starts with:', token.substring(0, 10) + '...');
    }
    return !!token;
  } catch (error) {
    console.error('Error checking auth token:', error);
    return false;
  }
};