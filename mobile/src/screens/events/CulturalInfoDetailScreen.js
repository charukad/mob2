import React, { useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import {
  Appbar,
  Text,
  Divider,
  Chip,
  List,
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Import redux actions
import {
  fetchCulturalInfoById,
} from '../../store/slices/eventsSlice';

// Import theme
import { COLORS, FONTS } from '../../constants/theme';

const CulturalInfoDetailScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { infoId } = route.params;
  const { currentCulturalInfo, loading } = useSelector(state => state.events);

  // Fetch cultural info details
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchCulturalInfoById(infoId));
    }, [dispatch, infoId])
  );

  // Share info
  const handleShare = async () => {
    if (!currentCulturalInfo) return;

    try {
      await Share.share({
        title: currentCulturalInfo.title,
        message: `${currentCulturalInfo.title}\n\n${currentCulturalInfo.description}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (loading || !currentCulturalInfo) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Cultural Information" />
        <Appbar.Action icon="share-variant" onPress={handleShare} />
      </Appbar.Header>

      <ScrollView style={styles.scrollView}>
        {/* Cover Image */}
        {currentCulturalInfo.image && (
          <Image
            source={{ uri: currentCulturalInfo.image }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.contentContainer}>
          {/* Title and Category */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>{currentCulturalInfo.title}</Text>
            <Chip style={styles.categoryChip}>{currentCulturalInfo.category}</Chip>
          </View>
          
          {/* Main Description */}
          <Text style={styles.description}>{currentCulturalInfo.description}</Text>
          
          {/* Details Section */}
          {currentCulturalInfo.details && currentCulturalInfo.details.length > 0 && (
            <>
              <Divider style={styles.divider} />
              
              <View style={styles.detailsSection}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="information" size={24} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Details</Text>
                </View>
                
                {currentCulturalInfo.details.map((detail, index) => (
                  <View key={index} style={styles.detailItem}>
                    <MaterialCommunityIcons
                      name="circle-medium"
                      size={20}
                      color={COLORS.primary}
                      style={styles.bulletIcon}
                    />
                    <Text style={styles.detailText}>{detail}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
          
          {/* Cultural Etiquette */}
          {currentCulturalInfo.etiquette && currentCulturalInfo.etiquette.length > 0 && (
            <>
              <Divider style={styles.divider} />
              
              <View style={styles.etiquetteSection}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="hand-heart" size={24} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Cultural Etiquette</Text>
                </View>
                
                <View style={styles.etiquetteContainer}>
                  <List.Section title="Do's" titleStyle={styles.etiquetteGroupTitle}>
                    {currentCulturalInfo.etiquette
                      .filter(item => item.do)
                      .map((item, index) => (
                        <View key={`do-${index}`} style={styles.etiquetteItem}>
                          <MaterialCommunityIcons
                            name="check-circle"
                            size={20}
                            color={COLORS.success}
                            style={styles.etiquetteIcon}
                          />
                          <Text style={styles.etiquetteText}>{item.text}</Text>
                        </View>
                      ))}
                  </List.Section>
                  
                  <List.Section title="Don'ts" titleStyle={styles.etiquetteGroupTitle}>
                    {currentCulturalInfo.etiquette
                      .filter(item => !item.do)
                      .map((item, index) => (
                        <View key={`dont-${index}`} style={styles.etiquetteItem}>
                          <MaterialCommunityIcons
                            name="close-circle"
                            size={20}
                            color={COLORS.error}
                            style={styles.etiquetteIcon}
                          />
                          <Text style={styles.etiquetteText}>{item.text}</Text>
                        </View>
                      ))}
                  </List.Section>
                </View>
              </View>
            </>
          )}
          
          {/* Additional Information */}
          {currentCulturalInfo.additionalInfo && (
            <>
              <Divider style={styles.divider} />
              
              <View style={styles.additionalInfoSection}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="book-open-page-variant" size={24} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Additional Information</Text>
                </View>
                
                <Text style={styles.additionalInfoText}>{currentCulturalInfo.additionalInfo}</Text>
              </View>
            </>
          )}
          
          {/* Related Events */}
          {currentCulturalInfo.relatedEvents && currentCulturalInfo.relatedEvents.length > 0 && (
            <>
              <Divider style={styles.divider} />
              
              <View style={styles.relatedEventsSection}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="calendar-star" size={24} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Related Events</Text>
                </View>
                
                {currentCulturalInfo.relatedEvents.map((event, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.relatedEventItem}
                    onPress={() => navigation.navigate('EventDetail', { eventId: event._id })}
                  >
                    <MaterialCommunityIcons name="calendar" size={20} color={COLORS.primary} />
                    <View style={styles.relatedEventInfo}>
                      <Text style={styles.relatedEventTitle}>{event.title}</Text>
                      <Text style={styles.relatedEventDate}>
                        {new Date(event.startDate).toLocaleDateString()}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.gray} />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          
          {/* External Resources */}
          {currentCulturalInfo.resources && currentCulturalInfo.resources.length > 0 && (
            <>
              <Divider style={styles.divider} />
              
              <View style={styles.resourcesSection}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="link-variant" size={24} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>External Resources</Text>
                </View>
                
                {currentCulturalInfo.resources.map((resource, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.resourceItem}
                    onPress={() => Linking.openURL(resource.url)}
                  >
                    <MaterialCommunityIcons
                      name={resource.type === 'website' ? 'web' : 'book-open-variant'}
                      size={20}
                      color={COLORS.primary}
                    />
                    <View style={styles.resourceInfo}>
                      <Text style={styles.resourceTitle}>{resource.title}</Text>
                      <Text style={styles.resourceUrl} numberOfLines={1}>{resource.url}</Text>
                    </View>
                    <MaterialCommunityIcons name="open-in-new" size={20} color={COLORS.gray} />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  coverImage: {
    width: '100%',
    height: 200,
  },
  contentContainer: {
    padding: 16,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  title: {
    ...FONTS.h1,
    flex: 1,
    marginRight: 16,
  },
  categoryChip: {
    backgroundColor: COLORS.primary,
  },
  description: {
    ...FONTS.body2,
    lineHeight: 24,
  },
  divider: {
    marginVertical: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    ...FONTS.h2,
    marginLeft: 8,
  },
  detailsSection: {
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingRight: 16,
  },
  bulletIcon: {
    marginTop: 3,
    marginRight: 8,
  },
  detailText: {
    ...FONTS.body3,
    flex: 1,
  },
  etiquetteSection: {
    marginBottom: 16,
  },
  etiquetteContainer: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 16,
  },
  etiquetteGroupTitle: {
    ...FONTS.h3,
    color: COLORS.darkGray,
  },
  etiquetteItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingRight: 16,
  },
  etiquetteIcon: {
    marginTop: 3,
    marginRight: 8,
  },
  etiquetteText: {
    ...FONTS.body3,
    flex: 1,
  },
  additionalInfoSection: {
    marginBottom: 16,
  },
  additionalInfoText: {
    ...FONTS.body3,
    lineHeight: 24,
  },
  relatedEventsSection: {
    marginBottom: 16,
  },
  relatedEventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    marginBottom: 8,
  },
  relatedEventInfo: {
    flex: 1,
    marginLeft: 12,
  },
  relatedEventTitle: {
    ...FONTS.body3Bold,
  },
  relatedEventDate: {
    ...FONTS.body4,
    color: COLORS.gray,
  },
  resourcesSection: {
    marginBottom: 16,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    marginBottom: 8,
  },
  resourceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resourceTitle: {
    ...FONTS.body3Bold,
  },
  resourceUrl: {
    ...FONTS.body4,
    color: COLORS.primary,
  },
});

export default CulturalInfoDetailScreen;