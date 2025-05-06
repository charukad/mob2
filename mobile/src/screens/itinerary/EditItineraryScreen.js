import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import {
  Appbar,
  TextInput,
  Button,
  Text,
  Divider,
  List,
  Chip,
  Switch,
  IconButton,
  ActivityIndicator,
  HelperText,
  Surface,
  FAB
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import DateTimePicker from '@react-native-community/datetimepicker';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { format } from 'date-fns';

// Import your itinerary actions 
// import { updateItinerary, fetchItineraryById } from '../../store/slices/itinerariesSlice';

const EditItineraryScreen = ({ route, navigation }) => {
  const { itineraryId } = route.params;
  const dispatch = useDispatch();
  
  // This would normally come from your Redux store
  // const { currentItinerary, loading, error } = useSelector(state => state.itineraries);
  
  // Local state
  const [itinerary, setItinerary] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 1 week from now
  const [budget, setBudget] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [activities, setActivities] = useState([]);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeDay, setActiveDay] = useState(1); // For multi-day itineraries
  
  // Fetch itinerary data when component mounts
  useEffect(() => {
    fetchItineraryData();
  }, [itineraryId]);
  
  // Fetch itinerary data
  const fetchItineraryData = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, you would use Redux:
      // await dispatch(fetchItineraryById(itineraryId));
      
      // Simulating API call with a timeout and mock data for now
      setTimeout(() => {
        const mockItinerary = {
          id: itineraryId || '1',
          title: 'Explore Southern Sri Lanka',
          description: 'A 5-day journey through the beautiful southern coast of Sri Lanka.',
          startDate: new Date('2025-05-15'),
          endDate: new Date('2025-05-20'),
          budget: 75000,
          isPrivate: false,
          activities: [
            {
              id: '1',
              day: 1,
              title: 'Visit Galle Fort',
              description: 'Explore the historic Galle Fort, a UNESCO World Heritage site.',
              startTime: '09:00',
              endTime: '12:00',
              location: {
                id: 'loc1',
                name: 'Galle Fort',
                latitude: 6.0269,
                longitude: 80.2167
              },
              cost: 2000,
              category: 'sightseeing'
            },
            {
              id: '2',
              day: 1,
              title: 'Lunch at a Local Restaurant',
              description: 'Enjoy authentic Sri Lankan cuisine at a local restaurant.',
              startTime: '12:30',
              endTime: '14:00',
              location: {
                id: 'loc2',
                name: 'Lucky Fort Restaurant',
                latitude: 6.0272,
                longitude: 80.2165
              },
              cost: 3500,
              category: 'food'
            },
            {
              id: '3',
              day: 2,
              title: 'Beach Day at Unawatuna',
              description: 'Relax and swim at the beautiful Unawatuna Beach.',
              startTime: '10:00',
              endTime: '16:00',
              location: {
                id: 'loc3',
                name: 'Unawatuna Beach',
                latitude: 6.0098,
                longitude: 80.2497
              },
              cost: 1500,
              category: 'beach'
            }
          ]
        };
        
        setItinerary(mockItinerary);
        setTitle(mockItinerary.title);
        setDescription(mockItinerary.description);
        setStartDate(new Date(mockItinerary.startDate));
        setEndDate(new Date(mockItinerary.endDate));
        setBudget(mockItinerary.budget.toString());
        setIsPrivate(mockItinerary.isPrivate);
        setActivities(mockItinerary.activities);
        
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching itinerary:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load itinerary details. Please try again.');
    }
  };
  
  // Handle date changes
  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
      
      // Ensure end date is not before start date
      if (selectedDate > endDate) {
        setEndDate(selectedDate);
      }
    }
  };
  
  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      // Ensure end date is not before start date
      if (selectedDate >= startDate) {
        setEndDate(selectedDate);
      } else {
        Alert.alert('Invalid Date', 'End date cannot be before start date.');
      }
    }
  };
  
  // Calculate number of days in itinerary
  const calculateDays = () => {
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end days
  };
  
  // Validate form
  const validateForm = () => {
    const validationErrors = {};
    
    if (!title.trim()) {
      validationErrors.title = 'Title is required';
    }
    
    if (!budget.trim()) {
      validationErrors.budget = 'Budget is required';
    } else if (isNaN(parseFloat(budget)) || parseFloat(budget) <= 0) {
      validationErrors.budget = 'Budget must be a positive number';
    }
    
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };
  
  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      
      const updatedItinerary = {
        id: itineraryId,
        title,
        description,
        startDate,
        endDate,
        budget: parseFloat(budget),
        isPrivate,
        activities
      };
      
      // In a real implementation, you would use Redux:
      // await dispatch(updateItinerary(updatedItinerary));
      
      // Simulate API call with a timeout
      setTimeout(() => {
        setSubmitting(false);
        Alert.alert('Success', 'Itinerary updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }, 1000);
    } catch (error) {
      console.error('Error updating itinerary:', error);
      setSubmitting(false);
      Alert.alert('Error', 'Failed to update itinerary. Please try again.');
    }
  };
  
  // Handle adding new activity
  const handleAddActivity = () => {
    navigation.navigate('AddActivity', {
      itineraryId,
      day: activeDay,
      onActivityAdded: (newActivity) => {
        setActivities([...activities, newActivity]);
      }
    });
  };
  
  // Handle editing activity
  const handleEditActivity = (activityId) => {
    const activity = activities.find(a => a.id === activityId);
    if (activity) {
      navigation.navigate('EditActivity', {
        itineraryId,
        activity,
        onActivityUpdated: (updatedActivity) => {
          setActivities(
            activities.map(a => a.id === updatedActivity.id ? updatedActivity : a)
          );
        }
      });
    }
  };
  
  // Handle deleting activity
  const handleDeleteActivity = (activityId) => {
    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this activity?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          onPress: () => {
            setActivities(activities.filter(a => a.id !== activityId));
          },
          style: 'destructive'
        }
      ]
    );
  };
  
  // Handle reordering activities
  const handleDragEnd = ({ data }) => {
    // Update order of activities
    setActivities(data);
  };
  
  // Filter activities by active day
  const getDayActivities = () => {
    return activities.filter(activity => activity.day === activeDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };
  
  // Render activity item
  const renderActivityItem = ({ item, drag, isActive }) => {
    // Get category icon
    const getCategoryIcon = (category) => {
      const icons = {
        sightseeing: 'camera',
        food: 'food',
        beach: 'beach',
        hiking: 'hiking',
        shopping: 'shopping',
        transport: 'car',
        accommodation: 'bed',
        default: 'map-marker'
      };
      
      return icons[category] || icons.default;
    };
    
    return (
      <Surface 
        style={[
          styles.activityItem,
          isActive && styles.activityItemActive
        ]}
      >
        <TouchableOpacity
          style={styles.dragHandle}
          onLongPress={drag}
        >
          <MaterialCommunityIcons name="drag" size={24} color="#BDBDBD" />
        </TouchableOpacity>
        
        <View style={styles.activityContent}>
          <View style={styles.activityHeader}>
            <View style={styles.activityTitleContainer}>
              <MaterialCommunityIcons 
                name={getCategoryIcon(item.category)} 
                size={20} 
                color="#2196F3" 
                style={styles.categoryIcon}
              />
              <Text style={styles.activityTitle}>{item.title}</Text>
            </View>
            
            <Text style={styles.activityTime}>
              {item.startTime} - {item.endTime}
            </Text>
          </View>
          
          {item.location && (
            <View style={styles.locationContainer}>
              <MaterialCommunityIcons name="map-marker" size={16} color="#757575" />
              <Text style={styles.locationText}>{item.location.name}</Text>
            </View>
          )}
          
          {item.description && (
            <Text 
              style={styles.activityDescription}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          )}
          
          <View style={styles.activityFooter}>
            {item.cost > 0 && (
              <Chip icon="currency-usd" style={styles.costChip}>
                {parseFloat(item.cost).toLocaleString()} LKR
              </Chip>
            )}
            
            <View style={styles.activityActions}>
              <IconButton
                icon="pencil"
                size={20}
                onPress={() => handleEditActivity(item.id)}
              />
              <IconButton
                icon="delete"
                size={20}
                color="#F44336"
                onPress={() => handleDeleteActivity(item.id)}
              />
            </View>
          </View>
        </View>
      </Surface>
    );
  };
  
  // Render day selector tabs
  const renderDayTabs = () => {
    const days = calculateDays();
    const tabs = [];
    
    for (let i = 1; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i - 1);
      
      tabs.push(
        <Chip
          key={i}
          selected={activeDay === i}
          onPress={() => setActiveDay(i)}
          style={[
            styles.dayTab,
            activeDay === i && styles.activeDayTab
          ]}
          textStyle={activeDay === i ? styles.activeDayTabText : null}
        >
          Day {i} - {format(date, 'MMM d')}
        </Chip>
      );
    }
    
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayTabsContainer}
      >
        {tabs}
      </ScrollView>
    );
  };
  
  // Check if loading
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading itinerary...</Text>
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Edit Itinerary" />
        <Appbar.Action 
          icon="content-save" 
          onPress={handleSave} 
          disabled={submitting}
        />
      </Appbar.Header>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Basic Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <TextInput
            label="Title"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            mode="outlined"
            error={!!errors.title}
          />
          {errors.title && (
            <HelperText type="error">{errors.title}</HelperText>
          )}
          
          <TextInput
            label="Description (Optional)"
            value={description}
            onChangeText={setDescription}
            style={styles.input}
            multiline
            numberOfLines={3}
            mode="outlined"
          />
          
          {/* Date Selection */}
          <View style={styles.dateSection}>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.dateLabel}>Start Date:</Text>
              <Text style={styles.dateValue}>{format(startDate, 'MMMM d, yyyy')}</Text>
              <MaterialCommunityIcons name="calendar" size={20} color="#2196F3" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.dateLabel}>End Date:</Text>
              <Text style={styles.dateValue}>{format(endDate, 'MMMM d, yyyy')}</Text>
              <MaterialCommunityIcons name="calendar" size={20} color="#2196F3" />
            </TouchableOpacity>
            
            {showStartDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={onStartDateChange}
                minimumDate={new Date()}
              />
            )}
            
            {showEndDatePicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="default"
                onChange={onEndDateChange}
                minimumDate={startDate}
              />
            )}
          </View>
          
          <TextInput
            label="Budget (LKR)"
            value={budget}
            onChangeText={setBudget}
            style={styles.input}
            keyboardType="numeric"
            mode="outlined"
            error={!!errors.budget}
          />
          {errors.budget && (
            <HelperText type="error">{errors.budget}</HelperText>
          )}
          
          <View style={styles.switchContainer}>
            <Text>Private Itinerary</Text>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              color="#2196F3"
            />
          </View>
          
          <Text style={styles.privateNote}>
            {isPrivate 
              ? 'This itinerary is private and only visible to you.' 
              : 'This itinerary is public and can be viewed by other users.'}
          </Text>
        </View>
        
        <Divider style={styles.divider} />
        
        {/* Activities Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activities</Text>
          
          <Text style={styles.durationText}>
            Duration: {calculateDays()} {calculateDays() === 1 ? 'day' : 'days'}
          </Text>
          
          {/* Day Tabs */}
          {renderDayTabs()}
          
          {/* Activities List */}
          <View style={styles.activitiesContainer}>
            {getDayActivities().length === 0 ? (
              <View style={styles.emptyActivities}>
                <MaterialCommunityIcons name="map-marker-off" size={48} color="#BDBDBD" />
                <Text style={styles.emptyText}>
                  No activities planned for Day {activeDay} yet.
                </Text>
                <Button
                  mode="contained"
                  onPress={handleAddActivity}
                  style={styles.addButton}
                >
                  Add Activity
                </Button>
              </View>
            ) : (
              <DraggableFlatList
                data={getDayActivities()}
                renderItem={renderActivityItem}
                keyExtractor={item => item.id}
                onDragEnd={handleDragEnd}
                contentContainerStyle={styles.activitiesList}
                scrollEnabled={false} // Prevent nested scrolling issues
              />
            )}
          </View>
          
          {/* Budget Summary */}
          <Surface style={styles.budgetSummary}>
            <Text style={styles.budgetTitle}>Budget Summary</Text>
            
            <View style={styles.budgetRow}>
              <Text style={styles.budgetLabel}>Total Budget:</Text>
              <Text style={styles.budgetValue}>
                {parseFloat(budget || 0).toLocaleString()} LKR
              </Text>
            </View>
            
            <View style={styles.budgetRow}>
              <Text style={styles.budgetLabel}>Activities Cost:</Text>
              <Text style={styles.budgetValue}>
                {activities
                  .reduce((sum, activity) => sum + (parseFloat(activity.cost) || 0), 0)
                  .toLocaleString()} LKR
              </Text>
            </View>
            
            <Divider style={styles.budgetDivider} />
            
            <View style={styles.budgetRow}>
              <Text style={styles.budgetLabel}>Remaining:</Text>
              <Text style={[
                styles.budgetValue,
                {
                  color: parseFloat(budget || 0) - activities.reduce((sum, activity) => sum + (parseFloat(activity.cost) || 0), 0) < 0
                    ? '#F44336'
                    : '#4CAF50'
                }
              ]}>
                {(
                  parseFloat(budget || 0) - 
                  activities.reduce((sum, activity) => sum + (parseFloat(activity.cost) || 0), 0)
                ).toLocaleString()} LKR
              </Text>
            </View>
          </Surface>
        </View>
      </ScrollView>
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleAddActivity}
        label="Add Activity"
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
  },
  scrollContent: {
    paddingBottom: 80, // Space for FAB
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  dateSection: {
    marginBottom: 12,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 4,
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 14,
    color: '#757575',
  },
  dateValue: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  privateNote: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  durationText: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 12,
  },
  dayTabsContainer: {
    paddingVertical: 12,
  },
  dayTab: {
    marginRight: 8,
  },
  activeDayTab: {
    backgroundColor: '#E3F2FD',
  },
  activeDayTabText: {
    color: '#2196F3',
  },
  activitiesContainer: {
    marginTop: 8,
    minHeight: 100,
  },
  activitiesList: {
    paddingBottom: 8,
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
  },
  activityItemActive: {
    backgroundColor: '#F5F5F5',
    elevation: 4,
  },
  dragHandle: {
    padding: 12,
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
    padding: 12,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    marginRight: 8,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  activityTime: {
    fontSize: 12,
    color: '#757575',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 8,
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costChip: {
    height: 24,
  },
  activityActions: {
    flexDirection: 'row',
  },
  emptyActivities: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    marginVertical: 16,
    textAlign: 'center',
  },
  addButton: {
    marginTop: 8,
  },
  budgetSummary: {
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    elevation: 2,
  },
  budgetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  budgetLabel: {
    color: '#757575',
  },
  budgetValue: {
    fontWeight: 'bold',
  },
  budgetDivider: {
    marginVertical: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#2196F3',
  },
});

export default EditItineraryScreen;