import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Share,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import {
  Appbar,
  Text,
  Button,
  Chip,
  Divider,
  ActivityIndicator,
  IconButton,
  Portal,
  Modal,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, isAfter, isBefore, addToCalendar } from 'date-fns';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

// Import redux actions
import {
  fetchEventById,
  saveEvent,
  addEventToCalendar,
} from '../../store/slices/eventsSlice';

// Import components
import CulturalInfoCard from '../../components/events/CulturalInfoCard';

// Import theme
import { COLORS, FONTS } from '../../constants/theme';

const EventDetailScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { eventId } = route.params;
  const { currentEvent, loading } = useSelector(state => state.events);
  
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  
  // Fetch event details
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchEventById(eventId));
    }, [dispatch, eventId])
  );
  
  // Handle saving event
  const handleSaveEvent = () => {
    dispatch(saveEvent(eventId));
  };
  
  // Handle sharing event
  const handleShareEvent = async () => {
    if (!currentEvent) return;
    
    try {
      await Share.share({
        title: currentEvent.title,
        message: `Check out this event: ${currentEvent.title}\n\n${currentEvent.description}\n\nDate: ${formatEventDate(currentEvent.startDate, currentEvent.endDate)}\n\nLocation: ${currentEvent.location?.name || 'TBA'}`,
      });
    } catch (error) {
      console.error('Error sharing event:', error);
    }
  };
  
  // Handle adding event to calendar
  const handleAddToCalendar = () => {
    dispatch(addEventToCalendar(eventId));
  };
  
  // Handle opening map for directions
  const handleGetDirections = () => {
    if (!currentEvent?.location?.coordinates) return;
    
    const { latitude, longitude } = currentEvent.location.coordinates;
    const label = encodeURIComponent(currentEvent.location.name);
    
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`,
    });
    
    Linking.openURL(url).catch(err => {
      console.error('Error opening maps app:', err);
    });
  };
  
  // Handle opening website
  const handleOpenWebsite = () => {
    if (!currentEvent?.website) return;
    
    Linking.openURL(currentEvent.website).catch(err => {
      console.error('Error opening website:', err);
    });
  };
  
  // Format date for display
  const formatEventDate = (startDate, endDate) => {
    const start = new Date(startDate);
    
    if (!endDate) {
      return format(start, 'MMMM d, yyyy');
    }
    
    const end = new Date(endDate);
    
    // Same day event
    if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
      return format(start, 'MMMM d, yyyy');
    }
    
    // Same month event
    if (format(start, 'yyyy-MM') === format(end, 'yyyy-MM')) {
      return `${format(start, 'MMMM d')} - ${format(end, 'd, yyyy')}`;
    }
    
    // Different month/year event
    return `${format(start, 'MMMM d, yyyy')} - ${format(end, 'MMMM d, yyyy')}`;
  };
  
  // Format time for display
  const formatEventTime = (startTime, endTime) => {
    if (!startTime) return 'All day';
    
    let formattedTime = format(new Date(`2000-01-01T${startTime}`), 'h:mm a');
    
    if (endTime) {
      formattedTime += ` - ${format(new Date(`2000-01-01T${endTime}`), 'h:mm a')}`;
    }
    
    return formattedTime;
  };
  
  // Get event status label and color
  const getEventStatus = () => {
    if (!currentEvent) return { label: 'Unknown', color: COLORS.gray };
    
    const now = new Date();
    const startDate = new Date(currentEvent.startDate);
    const endDate = currentEvent.endDate ? new Date(currentEvent.endDate) : startDate;
    
    if (isAfter(now, endDate)) {
      return { label: 'Past Event', color: COLORS.gray };
    }
    
    if (isBefore(now, startDate)) {
      // Calculate days remaining
      const diffTime = Math.abs(startDate - now);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        return { label: 'Tomorrow', color: COLORS.primary };
      } else if (diffDays <= 7) {
        return { label: `${diffDays} days away`, color: COLORS.primary };
      } else {
        return { label: 'Upcoming', color: COLORS.primary };
      }
    }
    
    return { label: 'Happening Now', color: COLORS.success };
  };
  
  // Handle image viewing
  const handleViewImage = (image) => {
    setSelectedImage(image);
    setImageViewerVisible(true);
  };
  
  if (loading || !currentEvent) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }
  
  const eventStatus = getEventStatus();
  
  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color={COLORS.white} />
        <Appbar.Content title="" color={COLORS.white} />
        <Appbar.Action
          icon={currentEvent.isSaved ? "bookmark" : "bookmark-outline"}
          onPress={handleSaveEvent}
          color={COLORS.white}
        />
        <Appbar.Action
          icon="share-variant"
          onPress={handleShareEvent}
          color={COLORS.white}
        />
      </Appbar.Header>
      
      <ScrollView style={styles.scrollView}>
        {/* Cover Image */}
        <Image
          source={{ uri: currentEvent.coverImage }}
          style={styles.coverImage}
          resizeMode="cover"
        />
        
        {/* Event Status */}
        <Chip
          style={[styles.statusChip, { backgroundColor: eventStatus.color }]}
          textStyle={styles.statusChipText}
        >
          {eventStatus.label}
        </Chip>
        
        {/* Event Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{currentEvent.title}</Text>
          
          {/* Date and Time */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar-range" size={24} color={COLORS.primary} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>
                  {formatEventDate(currentEvent.startDate, currentEvent.endDate)}
                </Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="clock-outline" size={24} color={COLORS.primary} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Time</Text>
                <Text style={styles.infoValue}>
                  {formatEventTime(currentEvent.startTime, currentEvent.endTime)}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Location */}
          {currentEvent.location && (
            <>
              <Divider style={styles.divider} />
              
              <View style={styles.locationSection}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="map-marker" size={24} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Location</Text>
                </View>
                
                <Text style={styles.locationName}>{currentEvent.location.name}</Text>
                
                {currentEvent.location.address && (
                  <Text style={styles.locationAddress}>{currentEvent.location.address}</Text>
                )}
                
                {currentEvent.location.coordinates && (
                  <View style={styles.mapContainer}>
                    <MapView
                      style={styles.map}
                      initialRegion={{
                        latitude: currentEvent.location.coordinates.latitude,
                        longitude: currentEvent.location.coordinates.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      provider={PROVIDER_GOOGLE}
                    >
                      <Marker
                        coordinate={{
                          latitude: currentEvent.location.coordinates.latitude,
                          longitude: currentEvent.location.coordinates.longitude,
                        }}
                        title={currentEvent.location.name}
                      />
                    </MapView>
                    
                    <Button
                      mode="contained"
                      onPress={handleGetDirections}
                      style={styles.directionsButton}
                      icon="directions"
                    >
                      Get Directions
                    </Button>
                  </View>
                )}
              </View>
            </>
          )}
          
          {/* Description */}
          <Divider style={styles.divider} />
          
          <View style={styles.descriptionSection}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="information" size={24} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>About This Event</Text>
            </View>
            
            <Text style={styles.description}>{currentEvent.description}</Text>
          </View>
          
          {/* Categories */}
          {currentEvent.categories && currentEvent.categories.length > 0 && (
            <View style={styles.categoriesContainer}>
              {currentEvent.categories.map((category, index) => (
                <Chip
                  key={index}
                  style={styles.categoryChip}
                >
                  {category}
                </Chip>
              ))}
            </View>
          )}
          
          {/* Additional Info */}
          {(currentEvent.entranceFee || currentEvent.website) && (
            <>
              <Divider style={styles.divider} />
              
              <View style={styles.additionalInfoSection}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="details" size={24} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Additional Information</Text>
                </View>
                
                {currentEvent.entranceFee && (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="cash" size={20} color={COLORS.gray} />
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Entrance Fee</Text>
                      <Text style={styles.infoValue}>{currentEvent.entranceFee}</Text>
                    </View>
                  </View>
                )}
                
                {currentEvent.website && (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="web" size={20} color={COLORS.gray} />
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Website</Text>
                      <TouchableOpacity onPress={handleOpenWebsite}>
                        <Text style={[styles.infoValue, styles.linkText]}>
                          {currentEvent.website}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </>
          )}
          
          {/* Event Photos */}
          {currentEvent.photos && currentEvent.photos.length > 0 && (
            <>
              <Divider style={styles.divider} />
              
              <View style={styles.photosSection}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="image-multiple" size={24} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Photos</Text>
                </View>
                
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photosContainer}
                >
                  {currentEvent.photos.map((photo, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.photoThumbnail}
                      onPress={() => handleViewImage(photo)}
                    >
                      <Image
                        source={{ uri: photo }}
                        style={styles.photoImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </>
          )}
          
          {/* Cultural Information */}
          {currentEvent.culturalInfo && (
            <>
              <Divider style={styles.divider} />
              
              <View style={styles.culturalInfoSection}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="book-open-variant" size={24} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Cultural Information</Text>
                </View>
                
                <CulturalInfoCard
                  info={currentEvent.culturalInfo}
                  onPress={() => navigation.navigate('CulturalInfoDetail', { infoId: currentEvent.culturalInfo._id })}
                />
              </View>
            </>
          )}
          
          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <Button
              mode="contained"
              onPress={handleAddToCalendar}
              style={styles.actionButton}
              icon="calendar-plus"
            >
              Add to Calendar
            </Button>
            
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('ItinerarySelector', { eventId: currentEvent._id })}
              style={styles.actionButton}
              icon="calendar-check"
            >
              Add to Itinerary
            </Button>
          </View>
        </View>
      </ScrollView>
      
      {/* Full-screen Image Viewer */}
      <Portal>
        <Modal
          visible={imageViewerVisible}
          onDismiss={() => setImageViewerVisible(false)}
          contentContainerStyle={styles.imageViewerContainer}
        >
          {selectedImage && (
            <>
              <Image
                source={{ uri: selectedImage }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
              <IconButton
                icon="close"
                size={30}
                color={COLORS.white}
                style={styles.closeButton}
                onPress={() => setImageViewerVisible(false)}
              />
            </>
          )}
        </Modal>
      </Portal>
    </View>
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
  appbar: {
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    elevation: 0,
  },
  scrollView: {
    flex: 1,
  },
  coverImage: {
    width: '100%',
    height: 250,
  },
  statusChip: {
    position: 'absolute',
    top: 220,
    right: 16,
    zIndex: 1,
  },
  statusChipText: {
    color: COLORS.white,
  },
  contentContainer: {
    padding: 16,
  },
  title: {
    ...FONTS.h1,
    marginBottom: 16,
  },
  infoSection: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTextContainer: {
    marginLeft: 12,
  },
  infoLabel: {
    ...FONTS.body4,
    color: COLORS.gray,
  },
  infoValue: {
    ...FONTS.body3,
  },
  divider: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    ...FONTS.h3,
    marginLeft: 8,
  },
  locationSection: {
    marginBottom: 16,
  },
  locationName: {
    ...FONTS.body2Bold,
    marginBottom: 4,
  },
  locationAddress: {
    ...FONTS.body3,
    color: COLORS.gray,
    marginBottom: 12,
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  directionsButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: COLORS.primary,
  },
  descriptionSection: {
    marginBottom: 16,
  },
  description: {
    ...FONTS.body3,
    lineHeight: 24,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  additionalInfoSection: {
    marginBottom: 16,
  },
  linkText: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  photosSection: {
    marginBottom: 16,
  },
  photosContainer: {
    paddingRight: 16,
  },
  photoThumbnail: {
    width: 120,
    height: 120,
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  culturalInfoSection: {
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  imageViewerContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});

export default EventDetailScreen;