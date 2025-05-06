import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  TextInput,
  Button,
  Headline,
  Text,
  HelperText,
  Switch,
  ActivityIndicator,
  IconButton,
} from 'react-native-paper';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { format } from 'date-fns';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Import components and utilities
import Header from '../../components/common/Header';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { createItinerary } from '../../store/slices/itinerariesSlice';

const CreateItineraryScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.itineraries);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [coverImage, setCoverImage] = useState(null);
  const [isPublic, setIsPublic] = useState(false);

  // Date picker visibility
  const [startDatePickerVisible, setStartDatePickerVisible] = useState(false);
  const [endDatePickerVisible, setEndDatePickerVisible] = useState(false);

  // Form validation
  const [errors, setErrors] = useState({});

  // Handle date selection
  const handleStartDateConfirm = (date) => {
    setStartDatePickerVisible(false);
    setStartDate(date);
    // If end date is before start date or not set, update it
    if (!endDate || endDate < date) {
      setEndDate(date);
    }
  };

  const handleEndDateConfirm = (date) => {
    setEndDatePickerVisible(false);
    setEndDate(date);
  };

  // Handle image picking
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to select a cover image.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setCoverImage(result.assets[0].uri);
    }
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!endDate) {
      newErrors.endDate = 'End date is required';
    } else if (endDate < startDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (budget && isNaN(parseFloat(budget))) {
      newErrors.budget = 'Budget must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleCreateItinerary = () => {
    if (!validateForm()) {
      return;
    }

    const itineraryData = {
      title,
      description,
      startDate,
      endDate,
      budget: budget ? parseFloat(budget) : 0,
      currency,
      isPublic,
    };

    // If cover image is selected, handle it with FormData
    if (coverImage) {
      const formData = new FormData();
      
      // Create file object for cover image
      const fileExt = coverImage.split('.').pop();
      const fileName = `cover_image_${Date.now()}.${fileExt}`;
      
      formData.append('coverImage', {
        uri: Platform.OS === 'android' ? coverImage : coverImage.replace('file://', ''),
        name: fileName,
        type: `image/${fileExt}`,
      });
      
      // Add other form data
      Object.keys(itineraryData).forEach(key => {
        if (key === 'startDate' || key === 'endDate') {
          formData.append(key, itineraryData[key].toISOString());
        } else {
          formData.append(key, itineraryData[key]);
        }
      });
      
      dispatch(createItinerary(formData))
        .unwrap()
        .then((result) => {
          navigation.navigate('ItineraryDetail', { itineraryId: result._id });
        })
        .catch((error) => {
          console.error('Failed to create itinerary:', error);
          // Handle specific errors from the API if needed
        });
    } else {
      // No cover image, just send the JSON data
      dispatch(createItinerary(itineraryData))
        .unwrap()
        .then((result) => {
          navigation.navigate('ItineraryDetail', { itineraryId: result._id });
        })
        .catch((error) => {
          console.error('Failed to create itinerary:', error);
        });
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header 
        title="Create New Itinerary" 
        showBackButton 
        onBackPress={() => navigation.goBack()} 
      />
      
      <ScrollView style={styles.container}>
        <View style={styles.form}>
          <Headline style={styles.headline}>Plan Your Adventure</Headline>
          
          {/* Title Input */}
          <TextInput
            label="Itinerary Title *"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            error={!!errors.title}
            mode="outlined"
          />
          {errors.title && <HelperText type="error">{errors.title}</HelperText>}
          
          {/* Description Input */}
          <TextInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            style={styles.input}
            multiline
            numberOfLines={3}
            mode="outlined"
          />
          
          {/* Date Selection */}
          <View style={styles.dateContainer}>
            {/* Start Date */}
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>Start Date *</Text>
              <TouchableOpacity
                style={[
                  styles.datePicker, 
                  errors.startDate && styles.datePickerError
                ]}
                onPress={() => setStartDatePickerVisible(true)}
              >
                <Text style={startDate ? styles.dateText : styles.datePlaceholder}>
                  {startDate ? format(startDate, 'MMM d, yyyy') : 'Select date'}
                </Text>
                <MaterialCommunityIcons name="calendar" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              {errors.startDate && <HelperText type="error">{errors.startDate}</HelperText>}
            </View>
            
            {/* End Date */}
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>End Date *</Text>
              <TouchableOpacity
                style={[
                  styles.datePicker, 
                  errors.endDate && styles.datePickerError
                ]}
                onPress={() => setEndDatePickerVisible(true)}
              >
                <Text style={endDate ? styles.dateText : styles.datePlaceholder}>
                  {endDate ? format(endDate, 'MMM d, yyyy') : 'Select date'}
                </Text>
                <MaterialCommunityIcons name="calendar" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              {errors.endDate && <HelperText type="error">{errors.endDate}</HelperText>}
            </View>
          </View>
          
          {/* Budget Input */}
          <View style={styles.budgetContainer}>
            <View style={styles.budgetField}>
              <TextInput
                label="Budget (optional)"
                value={budget}
                onChangeText={setBudget}
                keyboardType="numeric"
                style={[styles.input, styles.budgetInput]}
                error={!!errors.budget}
                mode="outlined"
              />
              {errors.budget && <HelperText type="error">{errors.budget}</HelperText>}
            </View>
            
            <View style={styles.currencyField}>
              <TextInput
                label="Currency"
                value={currency}
                onChangeText={setCurrency}
                style={[styles.input, styles.currencyInput]}
                mode="outlined"
              />
            </View>
          </View>
          
          {/* Cover Image Selection */}
          <Text style={styles.sectionTitle}>Cover Image</Text>
          <TouchableOpacity style={styles.coverImagePicker} onPress={pickImage}>
            {coverImage ? (
              <Image
                source={{ uri: coverImage }}
                style={styles.coverImagePreview}
              />
            ) : (
              <View style={styles.coverImagePlaceholder}>
                <MaterialCommunityIcons name="image-plus" size={48} color={COLORS.primary} />
                <Text style={styles.coverImageText}>Add a cover image</Text>
              </View>
            )}
            
            {coverImage && (
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setCoverImage(null)}
              >
                <MaterialCommunityIcons name="close-circle" size={28} color={COLORS.white} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          
          {/* Privacy Setting */}
          <View style={styles.privacyContainer}>
            <View style={styles.privacyTextContainer}>
              <Text style={styles.privacyTitle}>Make itinerary public</Text>
              <Text style={styles.privacyDescription}>
                Public itineraries can be seen by other travelers
              </Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              color={COLORS.primary}
            />
          </View>
          
          {/* Create Button */}
          <Button
            mode="contained"
            onPress={handleCreateItinerary}
            style={styles.createButton}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              "Create Itinerary"
            )}
          </Button>
        </View>
      </ScrollView>
      
      {/* Date Pickers */}
      <DateTimePickerModal
        isVisible={startDatePickerVisible}
        mode="date"
        onConfirm={handleStartDateConfirm}
        onCancel={() => setStartDatePickerVisible(false)}
        minimumDate={new Date()}
      />
      
      <DateTimePickerModal
        isVisible={endDatePickerVisible}
        mode="date"
        onConfirm={handleEndDateConfirm}
        onCancel={() => setEndDatePickerVisible(false)}
        minimumDate={startDate || new Date()}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  form: {
    padding: 16,
  },
  headline: {
    ...FONTS.h2,
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: COLORS.white,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateField: {
    width: '48%',
  },
  dateLabel: {
    ...FONTS.body4,
    marginBottom: 8,
  },
  datePicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 4,
    padding: 12,
    backgroundColor: COLORS.white,
  },
  datePickerError: {
    borderColor: COLORS.error,
  },
  dateText: {
    ...FONTS.body3,
  },
  datePlaceholder: {
    ...FONTS.body3,
    color: COLORS.gray,
  },
  budgetContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  budgetField: {
    flex: 2,
    marginRight: 8,
  },
  currencyField: {
    flex: 1,
  },
  budgetInput: {
    marginBottom: 0,
  },
  currencyInput: {
    marginBottom: 0,
  },
  sectionTitle: {
    ...FONTS.h3,
    marginTop: 8,
    marginBottom: 16,
  },
  coverImagePicker: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  coverImagePreview: {
    width: '100%',
    height: '100%',
  },
  coverImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImageText: {
    ...FONTS.body3,
    color: COLORS.gray,
    marginTop: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 14,
    padding: 0,
  },
  privacyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyTitle: {
    ...FONTS.h4,
    marginBottom: 4,
  },
  privacyDescription: {
    ...FONTS.body4,
    color: COLORS.gray,
  },
  createButton: {
    height: 50,
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: COLORS.primary,
  },
});

export default CreateItineraryScreen;