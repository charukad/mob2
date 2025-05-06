import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { 
  Text, 
  TextInput, 
  Button, 
  Snackbar, 
  Divider,
  ActivityIndicator,
  RadioButton,
  Card,
  Chip
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { createItineraryItem } from '../../store/slices/itinerariesSlice';
import { fetchLocationById } from '../../store/slices/locationsSlice';
import { COLORS, spacing } from '../../constants/theme';
import { Formik } from 'formik';
import * as Yup from 'yup';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

// Validation schema for activity type
const ActivitySchema = Yup.object().shape({
  title: Yup.string().required('Title is required'),
  description: Yup.string(),
  startTime: Yup.date().required('Start time is required'),
  endTime: Yup.date()
    .required('End time is required')
    .min(
      Yup.ref('startTime'),
      'End time must be after start time'
    ),
  'location.locationId': Yup.string(),
  'cost.amount': Yup.number().positive('Cost must be a positive number').nullable(),
  'cost.currency': Yup.string(),
  notes: Yup.string(),
});

// Validation schema for transport type
const TransportSchema = Yup.object().shape({
  title: Yup.string().required('Title is required'),
  description: Yup.string(),
  startTime: Yup.date().required('Start time is required'),
  endTime: Yup.date()
    .required('End time is required')
    .min(
      Yup.ref('startTime'),
      'End time must be after start time'
    ),
  'transport.method': Yup.string().required('Transport method is required'),
  'transport.from.name': Yup.string().required('Origin is required'),
  'transport.to.name': Yup.string().required('Destination is required'),
  'transport.distance': Yup.number().positive('Distance must be a positive number').nullable(),
  'cost.amount': Yup.number().positive('Cost must be a positive number').nullable(),
  'cost.currency': Yup.string(),
  notes: Yup.string(),
});

// Validation schema for accommodation type
const AccommodationSchema = Yup.object().shape({
  title: Yup.string().required('Title is required'),
  description: Yup.string(),
  startTime: Yup.date().required('Start time is required'),
  endTime: Yup.date()
    .required('End time is required')
    .min(
      Yup.ref('startTime'),
      'End time must be after start time'
    ),
  'accommodation.propertyType': Yup.string().required('Property type is required'),
  'accommodation.checkIn': Yup.date(),
  'accommodation.checkOut': Yup.date(),
  'location.name': Yup.string().required('Location name is required'),
  'cost.amount': Yup.number().positive('Cost must be a positive number').nullable(),
  'cost.currency': Yup.string(),
  notes: Yup.string(),
});

// Validation schema for meal type
const MealSchema = Yup.object().shape({
  title: Yup.string().required('Title is required'),
  description: Yup.string(),
  startTime: Yup.date().required('Start time is required'),
  endTime: Yup.date()
    .required('End time is required')
    .min(
      Yup.ref('startTime'),
      'End time must be after start time'
    ),
  'meal.mealType': Yup.string().required('Meal type is required'),
  'meal.cuisine': Yup.string(),
  'location.name': Yup.string(),
  'cost.amount': Yup.number().positive('Cost must be a positive number').nullable(),
  'cost.currency': Yup.string(),
  notes: Yup.string(),
});

const AddItineraryItemScreen = ({ route, navigation }) => {
  const { itineraryId, type = 'activity', day = 1, locationId } = route.params || {};
  const dispatch = useDispatch();
  const { itemsLoading, itemsError } = useSelector((state) => state.itineraries);
  const { currentLocation, loading: locationLoading } = useSelector((state) => state.locations);
  
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Fetch location details if locationId is provided
  useEffect(() => {
    if (locationId) {
      dispatch(fetchLocationById(locationId));
    }
  }, [dispatch, locationId]);

  // Get validation schema based on item type
  const getValidationSchema = () => {
    switch (type) {
      case 'transport':
        return TransportSchema;
      case 'accommodation':
        return AccommodationSchema;
      case 'meal':
        return MealSchema;
      default:
        return ActivitySchema;
    }
  };

  // Get initial values based on item type and current time
  const getInitialValues = () => {
    // Calculate start and end times
    const baseDate = new Date(); // Today
    baseDate.setHours(9, 0, 0, 0); // 9:00 AM
    
    const startTime = new Date(baseDate);
    const endTime = new Date(baseDate);
    endTime.setHours(endTime.getHours() + 2); // 2 hours later
    
    // Common fields
    const common = {
      title: currentLocation ? currentLocation.name : '',
      description: '',
      day,
      startTime,
      endTime,
      cost: {
        amount: '',
        currency: 'USD',
      },
      notes: '',
    };
    
    // Type-specific fields
    switch (type) {
      case 'transport':
        return {
          ...common,
          type: 'transport',
          transport: {
            method: 'car',
            from: {
              name: '',
              coordinates: null,
            },
            to: {
              name: '',
              coordinates: null,
            },
            distance: '',
            duration: null,
          },
        };
        
      case 'accommodation':
        return {
          ...common,
          type: 'accommodation',
          location: {
            locationId: '',
            name: '',
            coordinates: null,
            address: '',
          },
          accommodation: {
            propertyType: 'hotel',
            checkIn: startTime,
            checkOut: endTime,
          },
        };
        
      case 'meal':
        return {
          ...common,
          type: 'meal',
          location: {
            locationId: '',
            name: '',
            coordinates: null,
            address: '',
          },
          meal: {
            mealType: 'lunch',
            cuisine: '',
          },
        };
        
      default: // activity
        return {
          ...common,
          type: 'activity',
          location: {
            locationId: currentLocation ? currentLocation._id : '',
            name: currentLocation ? currentLocation.name : '',
            coordinates: currentLocation ? currentLocation.location : null,
            address: currentLocation ? `${currentLocation.address.city}, Sri Lanka` : '',
          },
        };
    }
  };

  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      // Format data
      const itemData = {
        ...values,
        cost: {
          ...values.cost,
          amount: values.cost.amount ? parseFloat(values.cost.amount) : 0,
        },
      };
      
      // If using transport, calculate duration
      if (type === 'transport' && values.startTime && values.endTime) {
        const durationMs = values.endTime - values.startTime;
        const durationMinutes = Math.round(durationMs / 60000);
        itemData.transport.duration = durationMinutes;
      }
      
      // Create item
      await dispatch(createItineraryItem({
        itineraryId,
        itemData,
      })).unwrap();
      
      // Navigate back to itinerary detail
      navigation.navigate('ItineraryDetail', { id: itineraryId });
    } catch (error) {
      setSnackbarMessage(error || 'Failed to create item');
      setSnackbarVisible(true);
    }
  };

  // Format time
  const formatTime = (date) => {
    return moment(date).format('h:mm A');
  };

  // Get title based on item type
  const getScreenTitle = () => {
    switch (type) {
      case 'transport':
        return 'Add Transport';
      case 'accommodation':
        return 'Add Accommodation';
      case 'meal':
        return 'Add Meal';
      default:
        return 'Add Activity';
    }
  };

  // Render type specific icon
  const getTypeIcon = () => {
    switch (type) {
      case 'transport':
        return <MaterialIcons name="directions-car" size={24} color={COLORS.info} />;
      case 'accommodation':
        return <MaterialIcons name="hotel" size={24} color={COLORS.success} />;
      case 'meal':
        return <MaterialIcons name="restaurant" size={24} color={COLORS.accent} />;
      default:
        return <MaterialIcons name="location-pin" size={24} color={COLORS.primary} />;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerContainer}>
          {getTypeIcon()}
          <Text style={styles.title}>{getScreenTitle()}</Text>
        </View>

        {locationLoading && locationId ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading location details...</Text>
          </View>
        ) : (
          <Formik
            initialValues={getInitialValues()}
            validationSchema={getValidationSchema()}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({
              handleChange,
              handleBlur,
              handleSubmit,
              values,
              errors,
              touched,
              setFieldValue,
            }) => (
              <View style={styles.form}>
                {/* Title */}
                <TextInput
                  label="Title"
                  value={values.title}
                  onChangeText={handleChange('title')}
                  onBlur={handleBlur('title')}
                  style={styles.input}
                  error={touched.title && errors.title}
                />
                {touched.title && errors.title && (
                  <Text style={styles.errorText}>{errors.title}</Text>
                )}

                {/* Description */}
                <TextInput
                  label="Description (Optional)"
                  value={values.description}
                  onChangeText={handleChange('description')}
                  onBlur={handleBlur('description')}
                  style={styles.input}
                  multiline
                  numberOfLines={3}
                />

                {/* Day */}
                <View style={styles.dayContainer}>
                  <Text style={styles.dayLabel}>Day</Text>
                  <Chip mode="outlined" style={styles.dayChip}>
                    Day {values.day}
                  </Chip>
                </View>

                {/* Time Selection */}
                <Text style={styles.sectionTitle}>Time</Text>
                <View style={styles.timeContainer}>
                  <TouchableOpacity
                    style={styles.timeSelector}
                    onPress={() => setShowStartTimePicker(true)}
                  >
                    <Text style={styles.timeLabel}>Start:</Text>
                    <Text style={styles.timeValue}>
                      {formatTime(values.startTime)}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.timeSelector}
                    onPress={() => setShowEndTimePicker(true)}
                  >
                    <Text style={styles.timeLabel}>End:</Text>
                    <Text style={styles.timeValue}>
                      {formatTime(values.endTime)}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showStartTimePicker && (
                  <DateTimePicker
                    value={values.startTime}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowStartTimePicker(false);
                      if (selectedDate) {
                        setFieldValue('startTime', selectedDate);
                      }
                    }}
                  />
                )}

                {showEndTimePicker && (
                  <DateTimePicker
                    value={values.endTime}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowEndTimePicker(false);
                      if (selectedDate) {
                        setFieldValue('endTime', selectedDate);
                      }
                    }}
                  />
                )}

                {touched.endTime && errors.endTime && (
                  <Text style={styles.errorText}>{errors.endTime}</Text>
                )}

                <Divider style={styles.divider} />

                {/* Type-specific fields */}
                {type === 'activity' && (
                  <View>
                    <Text style={styles.sectionTitle}>Location</Text>
                    {locationId && currentLocation ? (
                      <Card style={styles.locationCard}>
                        <Card.Content>
                          <Text style={styles.locationName}>{currentLocation.name}</Text>
                          <Text style={styles.locationAddress}>{currentLocation.address.city}, Sri Lanka</Text>
                          <Button
                            mode="outlined"
                            onPress={() => navigation.navigate('LocationDetail', { id: locationId })}
                            style={styles.viewLocationButton}
                          >
                            View Location
                          </Button>
                        </Card.Content>
                      </Card>
                    ) : (
                      <Button
                        mode="outlined"
                        icon="map"
                        onPress={() => {
                          navigation.navigate('ExploreMap', {
                            selectionMode: true,
                            onSelectLocation: (location) => {
                              setFieldValue('location.locationId', location._id);
                              setFieldValue('location.name', location.name);
                              setFieldValue('location.coordinates', location.location);
                              setFieldValue('location.address', `${location.address.city}, Sri Lanka`);
                              navigation.goBack();
                            }
                          });
                        }}
                      >
                        Select Location from Map
                      </Button>
                    )}
                  </View>
                )}

                {type === 'transport' && (
                  <View>
                    <Text style={styles.sectionTitle}>Transport Details</Text>
                    
                    <Text style={styles.fieldLabel}>Transport Method</Text>
                    <RadioButton.Group
                      onValueChange={(value) => setFieldValue('transport.method', value)}
                      value={values.transport.method}
                    >
                      <View style={styles.radioGroup}>
                        <View style={styles.radioOption}>
                          <RadioButton.Android value="car" color={COLORS.primary} />
                          <Text>Car</Text>
                        </View>
                        
                        <View style={styles.radioOption}>
                          <RadioButton.Android value="bus" color={COLORS.primary} />
                          <Text>Bus</Text>
                        </View>
                        
                        <View style={styles.radioOption}>
                          <RadioButton.Android value="train" color={COLORS.primary} />
                          <Text>Train</Text>
                        </View>
                        
                        <View style={styles.radioOption}>
                          <RadioButton.Android value="taxi" color={COLORS.primary} />
                          <Text>Taxi</Text>
                        </View>
                      </View>
                      
                      <View style={styles.radioGroup}>
                        <View style={styles.radioOption}>
                          <RadioButton.Android value="walk" color={COLORS.primary} />
                          <Text>Walk</Text>
                        </View>
                        
                        <View style={styles.radioOption}>
                          <RadioButton.Android value="bicycle" color={COLORS.primary} />
                          <Text>Bicycle</Text>
                        </View>
                        
                        <View style={styles.radioOption}>
                          <RadioButton.Android value="flight" color={COLORS.primary} />
                          <Text>Flight</Text>
                        </View>
                        
                        <View style={styles.radioOption}>
                          <RadioButton.Android value="other" color={COLORS.primary} />
                          <Text>Other</Text>
                        </View>
                      </View>
                    </RadioButton.Group>
                    
                    <TextInput
                      label="From"
                      value={values.transport.from.name}
                      onChangeText={handleChange('transport.from.name')}
                      onBlur={handleBlur('transport.from.name')}
                      style={styles.input}
                      error={touched.transport?.from?.name && errors.transport?.from?.name}
                    />
                    {touched.transport?.from?.name && errors.transport?.from?.name && (
                      <Text style={styles.errorText}>{errors.transport.from.name}</Text>
                    )}
                    
                    <TextInput
                      label="To"
                      value={values.transport.to.name}
                      onChangeText={handleChange('transport.to.name')}
                      onBlur={handleBlur('transport.to.name')}
                      style={styles.input}
                      error={touched.transport?.to?.name && errors.transport?.to?.name}
                    />
                    {touched.transport?.to?.name && errors.transport?.to?.name && (
                      <Text style={styles.errorText}>{errors.transport.to.name}</Text>
                    )}
                    
                    <TextInput
                      label="Distance (km)"
                      value={values.transport.distance.toString()}
                      onChangeText={handleChange('transport.distance')}
                      onBlur={handleBlur('transport.distance')}
                      style={styles.input}
                      keyboardType="numeric"
                    />
                  </View>
                )}

                {type === 'accommodation' && (
                  <View>
                    <Text style={styles.sectionTitle}>Accommodation Details</Text>
                    
                    <Text style={styles.fieldLabel}>Property Type</Text>
                    <RadioButton.Group
                      onValueChange={(value) => setFieldValue('accommodation.propertyType', value)}
                      value={values.accommodation.propertyType}
                    >
                      <View style={styles.radioGroup}>
                        <View style={styles.radioOption}>
                          <RadioButton.Android value="hotel" color={COLORS.primary} />
                          <Text>Hotel</Text>
                        </View>
                        
                        <View style={styles.radioOption}>
                          <RadioButton.Android value="hostel" color={COLORS.primary} />
                          <Text>Hostel</Text>
                        </View>
                        
                        <View style={styles.radioOption}>
                          <RadioButton.Android value="apartment" color={COLORS.primary} />
                          <Text>Apartment</Text>
                        </View>
                        
                        <View style={styles.radioOption}>
                          <RadioButton.Android value="guesthouse" color={COLORS.primary} />
                          <Text>Guesthouse</Text>
                        </View>
                      </View>
                    </RadioButton.Group>
                    
                    <TextInput
                      label="Location Name"
                      value={values.location.name}
                      onChangeText={handleChange('location.name')}
                      onBlur={handleBlur('location.name')}
                      style={styles.input}
                      error={touched.location?.name && errors.location?.name}
                    />
                    {touched.location?.name && errors.location?.name && (
                      <Text style={styles.errorText}>{errors.location.name}</Text>
                    )}
                    
                    <View style={styles.timeContainer}>
                      <TouchableOpacity
                        style={styles.timeSelector}
                        onPress={() => setShowCheckInPicker(true)}
                      >
                        <Text style={styles.timeLabel}>Check-in:</Text>
                        <Text style={styles.timeValue}>
                          {formatTime(values.accommodation.checkIn)}
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.timeSelector}
                        onPress={() => setShowCheckOutPicker(true)}
                      >
                        <Text style={styles.timeLabel}>Check-out:</Text>
                        <Text style={styles.timeValue}>
                          {formatTime(values.accommodation.checkOut)}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {showCheckInPicker && (
                      <DateTimePicker
                        value={values.accommodation.checkIn}
                        mode="time"
                        is24Hour={false}
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowCheckInPicker(false);
                          if (selectedDate) {
                            setFieldValue('accommodation.checkIn', selectedDate);
                          }
                        }}
                      />
                    )}

                    {showCheckOutPicker && (
                      <DateTimePicker
                        value={values.accommodation.checkOut}
                        mode="time"
                        is24Hour={false}
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowCheckOutPicker(false);
                          if (selectedDate) {
                            setFieldValue('accommodation.checkOut', selectedDate);
                          }
                        }}
                      />
                    )}
                  </View>
                )}

                {type === 'meal' && (
                  <View>
                    <Text style={styles.sectionTitle}>Meal Details</Text>
                    
                    <Text style={styles.fieldLabel}>Meal Type</Text>
                    <RadioButton.Group
                      onValueChange={(value) => setFieldValue('meal.mealType', value)}
                      value={values.meal.mealType}
                    >
                      <View style={styles.radioGroup}>
                        <View style={styles.radioOption}>
                          <RadioButton.Android value="breakfast" color={COLORS.primary} />
                          <Text>Breakfast</Text>
                        </View>
                        
                        <View style={styles.radioOption}>
                          <RadioButton.Android value="lunch" color={COLORS.primary} />
                          <Text>Lunch</Text>
                        </View>
                        
                        <View style={styles.radioOption}>
                          <RadioButton.Android value="dinner" color={COLORS.primary} />
                          <Text>Dinner</Text>
                        </View>
                        
                        <View style={styles.radioOption}>
                          <RadioButton.Android value="snack" color={COLORS.primary} />
                          <Text>Snack</Text>
                        </View>
                      </View>
                    </RadioButton.Group>
                    
                    <TextInput
                      label="Cuisine (Optional)"
                      value={values.meal.cuisine}
                      onChangeText={handleChange('meal.cuisine')}
                      onBlur={handleBlur('meal.cuisine')}
                      style={styles.input}
                    />
                    
                    <TextInput
                      label="Restaurant/Location Name (Optional)"
                      value={values.location.name}
                      onChangeText={handleChange('location.name')}
                      onBlur={handleBlur('location.name')}
                      style={styles.input}
                    />
                  </View>
                )}

                <Divider style={styles.divider} />

                {/* Cost */}
                <Text style={styles.sectionTitle}>Cost (Optional)</Text>
                <View style={styles.costContainer}>
                  <TextInput
                    label="Amount"
                    value={values.cost.amount.toString()}
                    onChangeText={handleChange('cost.amount')}
                    onBlur={handleBlur('cost.amount')}
                    style={styles.costInput}
                    keyboardType="numeric"
                  />
                  
                  <RadioButton.Group
                    onValueChange={(value) => setFieldValue('cost.currency', value)}
                    value={values.cost.currency}
                  >
                    <View style={styles.currencyContainer}>
                      <View style={styles.radioOption}>
                        <RadioButton.Android value="USD" color={COLORS.primary} />
                        <Text>USD</Text>
                      </View>
                      
                      <View style={styles.radioOption}>
                        <RadioButton.Android value="LKR" color={COLORS.primary} />
                        <Text>LKR</Text>
                      </View>
                      
                      <View style={styles.radioOption}>
                        <RadioButton.Android value="EUR" color={COLORS.primary} />
                        <Text>EUR</Text>
                      </View>
                    </View>
                  </RadioButton.Group>
                </View>

                {/* Notes */}
                <TextInput
                  label="Notes (