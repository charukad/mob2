import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  IconButton,
  RadioButton,
  HelperText,
  Divider,
  ActivityIndicator,
  Title,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as ImagePicker from 'expo-image-picker';

// Import components and utilities
import Header from '../../components/common/Header';
import { COLORS, FONTS } from '../../constants/theme';
import { createItineraryItem } from '../../store/slices/itinerariesSlice';

// Activity type definitions
const ACTIVITY_TYPES = [
  {
    value: 'visit',
    label: 'Visit',
    icon: 'map-marker',
    color: COLORS.primary,
  },
  {
    value: 'food',
    label: 'Food',
    icon: 'food-fork-drink',
    color: '#FF8C00',
  },
  {
    value: 'transport',
    label: 'Transport',
    icon: 'car',
    color: '#4682B4',
  },
  {
    value: 'accommodation',
    label: 'Accommodation',
    icon: 'bed',
    color: '#8A2BE2',
  },
  {
    value: 'activity',
    label: 'Activity',
    icon: 'hiking',
    color: '#32CD32',
  },
  {
    value: 'other',
    label: 'Other',
    icon: 'dots-horizontal',
    color: '#708090',
  },
];

const AddActivityScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector(state => state.itineraries);
  
  const { itineraryId, date, startTime = '09:00' } = route.params;
  
  // Calculate a default end time (1 hour after start time)
  const calculateDefaultEndTime = (startTimeStr) => {
    const [hours, minutes] = startTimeStr.split(':').map(num => parseInt(num, 10));
    const endDate = new Date();
    endDate.setHours(hours);
    endDate.setMinutes(minutes);
    endDate.setHours(endDate.getHours() + 1);
    
    const endHours = endDate.getHours().toString().padStart(2, '0');
    const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
    
    return `${endHours}:${endMinutes}`;
  };
  
  // Form state
  const [activityType, setActivityType] = useState('visit');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [cost, setCost] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timeStart, setTimeStart] = useState(startTime);
  const [timeEnd, setTimeEnd] = useState(calculateDefaultEndTime(startTime));
  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState('');
  
  // Time picker visibility
  const [startTimePickerVisible, setStartTimePickerVisible] = useState(false);
  const [endTimePickerVisible, setEndTimePickerVisible] = useState(false);
  
  // Form validation
  const [errors, setErrors] = useState({});
  
  // Handle time selection
  const handleStartTimeConfirm = (selectedTime) => {
    setStartTimePickerVisible(false);
    
    const hours = selectedTime.getHours().toString().padStart(2, '0');
    const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;
    
    setTimeStart(formattedTime);
    
    // If end time is before start time, update it
    const endTimeParts = timeEnd.split(':').map(num => parseInt(num, 10));
    const startTimeParts = [hours, minutes].map(num => parseInt(num, 10));
    
    if (
      endTimeParts[0] < startTimeParts[0] || 
      (endTimeParts[0] === startTimeParts[0] && endTimeParts[1] <= startTimeParts[1])
    ) {
      // Set end time to 1 hour after start time
      setTimeEnd(calculateDefaultEndTime(formattedTime));
    }
  };
  
  const handleEndTimeConfirm = (selectedTime) => {
    setEndTimePickerVisible(false);
    
    const hours = selectedTime.getHours().toString().padStart(2, '0');
    const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
    
    setTimeEnd(`${hours}:${minutes}`);
  };
  
  // Handle image picking
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to select images.');
      return;
    }
    
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });
    
    if (!result.canceled) {
      const selectedAssets = result.assets || [];
      if (photos.length + selectedAssets.length > 5) {
        alert('You can only add up to 5 photos for an activity.');
        const remainingSlots = 5 - photos.length;
        if (remainingSlots > 0) {
          setPhotos([...photos, ...selectedAssets.slice(0, remainingSlots).map(asset => asset.uri)]);
        }
      } else {
        setPhotos([...photos, ...selectedAssets.map(asset => asset.uri)]);
      }
    }
  };
  
  // Remove a photo
  const removePhoto = (index) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };
  
  // Open location picker
  const handleLocationPicker = () => {
    // This would navigate to a location picker screen
    // For now, we'll just set a mock location
    setLocation({
      name: 'Temple of the Tooth Relic',
      address: 'Sri Dalada Veediya, Kandy, Sri Lanka',
      coordinates: {
        latitude: 7.2936,
        longitude: 80.6413
      }
    });
  };
  
  // Clear selected location
  const clearLocation = () => {
    setLocation(null);
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!timeStart) {
      newErrors.timeStart = 'Start time is required';
    }
    
    if (!timeEnd) {
      newErrors.timeEnd = 'End time is required';
    }
    
    if (cost && isNaN(parseFloat(cost))) {
      newErrors.cost = 'Cost must be a number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSaveActivity = () => {
    if (!validateForm()) {
      return;
    }
    
    // Create activity data
    const activityData = {
      itineraryId,
      date,
      type: activityType,
      title,
      description,
      startTime: timeStart,
      endTime: timeEnd,
      cost: cost ? parseFloat(cost) : 0,
      currency,
      notes
    };
    
    // Add location if selected
    if (location) {
      activityData.location = location;
    }
    
    // Handle photos if any
    if (photos.length > 0) {
      const formData = new FormData();
      
      // Add activity data to form data
      Object.keys(activityData).forEach(key => {
        if (key === 'location' && activityData.location) {
          formData.append(key, JSON.stringify(activityData.location));
        } else {
          formData.append(key, activityData[key]);
        }
      });
      
      // Add photos to form data
      photos.forEach((photo, index) => {
        const fileExt = photo.split('.').pop();
        const fileName = `activity_photo_${Date.now()}_${index}.${fileExt}`;
        
        formData.append('photos', {
          uri: Platform.OS === 'android' ? photo : photo.replace('file://', ''),
          name: fileName,
          type: `image/${fileExt}`
        });
      });
      
      dispatch(createItineraryItem(formData))
        .unwrap()
        .then(() => {
          navigation.goBack();
        })
        .catch(error => {
          console.error('Failed to create activity:', error);
          // Handle specific errors if needed
        });
    } else {
      // No photos, just send the JSON data
      dispatch(createItineraryItem(activityData))
        .unwrap()
        .then(() => {
          navigation.goBack();
        })
        .catch(error => {
          console.error('Failed to create activity:', error);
        });
    }
  };
  
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header 
        title="Add Activity" 
        showBackButton 
        onBackPress={() => navigation.goBack()} 
      />
      
      <ScrollView style={styles.container}>
        <View style={styles.form}>
          <Text style={styles.dateText}>
            Adding activity for {format(new Date(date), 'EEEE, MMMM d, yyyy')}
          </Text>
          
          {/* Activity Type */}
          <Text style={styles.sectionTitle}>Activity Type</Text>
          <View style={styles.activityTypeContainer}>
            {ACTIVITY_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.activityTypeButton,
                  activityType === type.value && styles.selectedActivityType,
                  { borderColor: type.color }
                ]}
                onPress={() => setActivityType(type.value)}
              >
                <MaterialCommunityIcons
                  name={type.icon}
                  size={24}
                  color={activityType === type.value ? COLORS.white : type.color}
                />
                <Text
                  style={[
                    styles.activityTypeText,
                    activityType === type.value && styles.selectedActivityTypeText
                  ]}
                >
                  {type.label}
                </Text>
                <View
                  style={[
                    styles.activityTypeOverlay,
                    activityType === type.value && { backgroundColor: type.color }
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Basic Information */}
          <TextInput
            label="Activity Title *"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            error={!!errors.title}
            mode="outlined"
          />
          {errors.title && <HelperText type="error">{errors.title}</HelperText>}
          
          <TextInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={styles.input}
            mode="outlined"
          />
          
          {/* Time Selection */}
          <Text style={styles.sectionTitle}>Time</Text>
          <View style={styles.timeContainer}>
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>Start Time *</Text>
              <TouchableOpacity
                style={[
                  styles.timePicker,
                  errors.timeStart && styles.timePickerError
                ]}
                onPress={() => setStartTimePickerVisible(true)}
              >
                <Text style={styles.timeText}>
                  {timeStart ? format(new Date(`2000-01-01T${timeStart}`), 'h:mm a') : 'Select time'}
                </Text>
                <MaterialCommunityIcons name="clock" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              {errors.timeStart && <HelperText type="error">{errors.timeStart}</HelperText>}
            </View>
            
            <View style={styles.timeField}>
              <Text style={styles.timeLabel}>End Time *</Text>
              <TouchableOpacity
                style={[
                  styles.timePicker,
                  errors.timeEnd && styles.timePickerError
                ]}
                onPress={() => setEndTimePickerVisible(true)}
              >
                <Text style={styles.timeText}>
                  {timeEnd ? format(new Date(`2000-01-01T${timeEnd}`), 'h:mm a') : 'Select time'}
                </Text>
                <MaterialCommunityIcons name="clock" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              {errors.timeEnd && <HelperText type="error">{errors.timeEnd}</HelperText>}
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Location Selection */}
          <Text style={styles.sectionTitle}>Location</Text>
          {location ? (
            <View style={styles.selectedLocation}>
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>{location.name}</Text>
                <Text style={styles.locationAddress}>{location.address}</Text>
              </View>
              <IconButton
                icon="close"
                size={20}
                onPress={clearLocation}
                color={COLORS.gray}
              />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.locationPicker}
              onPress={handleLocationPicker}
            >
              <MaterialCommunityIcons name="map-marker-plus" size={24} color={COLORS.primary} />
              <Text style={styles.locationPickerText}>Select a location</Text>
            </TouchableOpacity>
          )}
          
          <Divider style={styles.divider} />
          
          {/* Cost Information */}
          <Text style={styles.sectionTitle}>Cost (Optional)</Text>
          <View style={styles.costContainer}>
            <View style={styles.costField}>
              <TextInput
                label="Cost"
                value={cost}
                onChangeText={setCost}
                keyboardType="numeric"
                style={[styles.input, styles.costInput]}
                error={!!errors.cost}
                mode="outlined"
              />
              {errors.cost && <HelperText type="error">{errors.cost}</HelperText>}
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
          
          <Divider style={styles.divider} />
          
          {/* Photos */}
          <Text style={styles.sectionTitle}>Photos (Optional)</Text>
          <View style={styles.photosContainer}>
            {photos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosList}>
                {photos.map((photo, index) => (
                  <View key={index} style={styles.photoItem}>
                    <Image source={{ uri: photo }} style={styles.photoPreview} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => removePhoto(index)}
                    >
                      <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            
            {photos.length < 5 && (
              <TouchableOpacity style={styles.addPhotoButton} onPress={pickImage}>
                <MaterialCommunityIcons name="camera-plus" size={24} color={COLORS.primary} />
                <Text style={styles.addPhotoText}>
                  {photos.length === 0 ? 'Add photos' : 'Add more photos'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Notes */}
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <TextInput
            label="Additional notes or reminders"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            style={styles.input}
            mode="outlined"
          />
          
          {/* Save Button */}
          <Button
            mode="contained"
            onPress={handleSaveActivity}
            style={styles.saveButton}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              "Save Activity"
            )}
          </Button>
        </View>
      </ScrollView>
      
      {/* Time Pickers */}
      <DateTimePickerModal
        isVisible={startTimePickerVisible}
        mode="time"
        onConfirm={handleStartTimeConfirm}
        onCancel={() => setStartTimePickerVisible(false)}
        minuteInterval={5}
        is24Hour={false}
      />
      
      <DateTimePickerModal
        isVisible={endTimePickerVisible}
        mode="time"
        onConfirm={handleEndTimeConfirm}
        onCancel={() => setEndTimePickerVisible(false)}
        minuteInterval={5}
        is24Hour={false}
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
  dateText: {
    ...FONTS.body3,
    marginBottom: 16,
    color: COLORS.gray,
  },
  sectionTitle: {
    ...FONTS.h3,
    marginBottom: 12,
  },
  input: {
    marginBottom: 16,
    backgroundColor: COLORS.white,
  },
  divider: {
    marginVertical: 16,
  },
  activityTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  activityTypeButton: {
    width: '30%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: '5%',
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  activityTypeButton: {
    width: '30%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: '5%',
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  activityTypeText: {
    ...FONTS.body4,
    marginTop: 8,
  },
  selectedActivityType: {
    borderWidth: 0,
  },
  selectedActivityTypeText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  activityTypeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: -1,
  },
  timeContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timeField: {
    flex: 1,
    marginRight: 8,
  },
  timeField: {
    flex: 1,
    marginRight: 8,
  },
  timeLabel: {
    ...FONTS.body4,
    marginBottom: 8,
  },
  timePicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 4,
  },
  timePickerError: {
    borderColor: COLORS.error,
  },
  timeText: {
    ...FONTS.body3,
  },
  locationPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    borderRadius: 8,
    marginBottom: 8,
  },
  locationPickerText: {
    ...FONTS.body3,
    color: COLORS.primary,
    marginLeft: 8,
  },
  selectedLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    marginBottom: 8,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    ...FONTS.body3Bold,
    marginBottom: 4,
  },
  locationAddress: {
    ...FONTS.body4,
    color: COLORS.gray,
  },
  costContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  costField: {
    flex: 2,
    marginRight: 8,
  },
  currencyField: {
    flex: 1,
  },
  costInput: {
    marginBottom: 0,
  },
  currencyInput: {
    marginBottom: 0,
  },
  photosContainer: {
    marginBottom: 8,
  },
  photosList: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  photoItem: {
    marginRight: 12,
    position: 'relative',
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 2,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    borderRadius: 8,
  },
  addPhotoText: {
    ...FONTS.body3,
    color: COLORS.primary,
    marginLeft: 8,
  },
  saveButton: {
    height: 50,
    justifyContent: 'center',
    marginVertical: 24,
    backgroundColor: COLORS.primary,
  },
});

export default AddActivityScreen;