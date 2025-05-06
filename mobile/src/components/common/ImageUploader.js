import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Button, ActivityIndicator, Text } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { COLORS } from '../../constants/theme';

const ImageUploader = ({
  endpoint,
  initialImage,
  onSuccess,
  onError,
  buttonText = 'Upload Image',
  style
}) => {
  const [image, setImage] = useState(initialImage || null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      onError('Permission to access media library was denied');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        uploadImage(selectedAsset.uri);
      }
    } catch (error) {
      onError('Error picking image: ' + error.message);
    }
  };

  const uploadImage = async (uri) => {
    setLoading(true);
    setProgress(0);
    
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image';
      
      formData.append('image', {
        uri,
        name: filename,
        type
      });

      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        }
      });

      if (response.data && response.data.data && response.data.data.imageUrl) {
        setImage(response.data.data.imageUrl);
        onSuccess(response.data.data);
      } else if (response.data && response.data.imageUrl) {
        setImage(response.data.imageUrl);
        onSuccess(response.data);
      } else {
        setImage(initialImage);
        onError('Invalid response format from server. Try refreshing your profile.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      if (error.code === 'ECONNABORTED') {
        setImage(initialImage);
        onError('The upload is taking longer than expected. Your image may still be processing - try refreshing your profile in a moment.');
      } else {
        onError(error.response?.data?.message || error.message || 'Error uploading image');
      }
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {image ? (
        <TouchableOpacity onPress={pickImage}>
          <Image source={{ uri: image }} style={styles.image} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={styles.placeholder} 
          onPress={pickImage}
        >
          <Text style={styles.placeholderText}>No image selected</Text>
        </TouchableOpacity>
      )}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator style={styles.loading} color={COLORS.primary} />
          {progress > 0 && (
            <Text style={styles.progressText}>Uploading: {progress}%</Text>
          )}
        </View>
      ) : (
        <Button 
          mode="outlined" 
          onPress={pickImage} 
          style={styles.button}
          color={COLORS.primary}
        >
          {buttonText}
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 10,
  },
  placeholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#888',
    textAlign: 'center',
    padding: 10,
  },
  button: {
    marginTop: 10,
  },
  loadingContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  loading: {
    marginBottom: 5,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.primary,
  }
});

export default ImageUploader; 