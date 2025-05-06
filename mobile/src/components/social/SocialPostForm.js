import { createPost } from '../../store/slices/socialSlice';
import { restoreAuthToken } from '../../store/slices/authSlice';
import { PostErrorDisplay } from './PostErrorDisplay';

const handleSubmit = async () => {
  if (!content.trim() && !images.length) {
    alert('Please add some content or images to your post.');
    return;
  }
  
  setSubmitting(true);
  
  try {
    // Check authentication before attempting to create post
    if (!auth.token || !auth.isAuthenticated) {
      console.log('Authentication token missing, attempting to restore it');
      await dispatch(restoreAuthToken()).unwrap();
      
      // If still not authenticated after restoration attempt, show an error
      if (!auth.token || !auth.isAuthenticated) {
        throw new Error('Authentication required. Please log in again.');
      }
    }
    
    const formData = new FormData();
    formData.append('content', content);
    
    // Debug FormData
    console.log('Form data keys:', Object.keys(formData));
    
    // Add images to form data
    if (images.length > 0) {
      images.forEach((image, index) => {
        // Create file name based on timestamp to prevent name collisions
        const fileName = `post_image_${Date.now()}_${index}.${image.uri.split('.').pop()}`;
        console.log(`Adding image #${index} to form data:`, {
          name: fileName,
          type: image.type || 'image/jpeg',
          uri: image.uri
        });
        
        formData.append('images', {
          name: fileName,
          type: image.type || 'image/jpeg',
          uri: image.uri
        });
      });
    }
    
    const result = await dispatch(createPost(formData)).unwrap();
    console.log('Post created successfully:', result);
    
    // Clear form
    setContent('');
    setImages([]);
    
    // Navigate to feed or show success message
    onSuccess && onSuccess();
  } catch (error) {
    console.error('Error creating post:', error);
    setError(error.message || 'Failed to create the post. Please try again.');
  } finally {
    setSubmitting(false);
  }
};

{error && (
  <PostErrorDisplay 
    errorMessage={error}
    onRetry={() => {
      setError(null);
      dispatch(restoreAuthToken());
    }}
  />
)} 