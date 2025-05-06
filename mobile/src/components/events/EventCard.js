import React from 'react';
import { View, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useNavigation } from '@react-navigation/native';

import { COLORS, FONTS } from '../../constants/theme';

const EventCard = ({ event, compact = false }) => {
  const navigation = useNavigation();

  // Format date display
  const formatEventDate = (startDate, endDate) => {
    const start = new Date(startDate);
    
    if (!endDate) {
      return format(start, 'MMM d, yyyy');
    }
    
    const end = new Date(endDate);
    
    // Same day event
    if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
      return format(start, 'MMM d, yyyy');
    }
    
    // Same month event
    if (format(start, 'yyyy-MM') === format(end, 'yyyy-MM')) {
      return `${format(start, 'MMM d')} - ${format(end, 'd, yyyy')}`;
    }
    
    // Different month/year event
    return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
  };

  // Get days remaining from today
  const getDaysRemaining = (date) => {
    const eventDate = new Date(date);
    const today = new Date();
    
    // Set time to midnight for accurate day comparison
    eventDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return 'Ended';
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else {
      return `${diffDays} days left`;
    }
  };

  // Handle navigation to event details
  const handlePress = () => {
    navigation.navigate('EventDetail', { eventId: event._id });
  };

  // Compact card layout (for horizontal scrolling)
  if (compact) {
    return (
      <TouchableOpacity onPress={handlePress}>
        <Card style={styles.compactCard}>
          <ImageBackground
            source={{ uri: event.coverImage }}
            style={styles.compactImage}
            imageStyle={styles.compactImageStyle}
          >
            <View style={styles.compactOverlay}>
              <Chip
                style={[
                  styles.compactStatus,
                  {
                    backgroundColor: event.startDate > new Date().toISOString()
                      ? COLORS.primary
                      : event.endDate > new Date().toISOString()
                        ? COLORS.success
                        : COLORS.gray
                  }
                ]}
                textStyle={styles.compactStatusText}
              >
                {event.startDate > new Date().toISOString()
                  ? 'Upcoming'
                  : event.endDate > new Date().toISOString()
                    ? 'Ongoing'
                    : 'Past'}
              </Chip>
            </View>
          </ImageBackground>
          
          <Card.Content style={styles.compactContent}>
            <Text style={styles.compactTitle} numberOfLines={1}>{event.title}</Text>
            <View style={styles.compactInfo}>
              <MaterialCommunityIcons name="calendar" size={12} color={COLORS.gray} />
              <Text style={styles.compactDate}>
                {formatEventDate(event.startDate, event.endDate)}
              </Text>
            </View>
            {event.location && (
              <View style={styles.compactInfo}>
                <MaterialCommunityIcons name="map-marker" size={12} color={COLORS.gray} />
                <Text style={styles.compactLocation} numberOfLines={1}>
                  {event.location.name}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  }

  // Standard card layout
  return (
    <TouchableOpacity onPress={handlePress}>
      <Card style={styles.card}>
        <ImageBackground
          source={{ uri: event.coverImage }}
          style={styles.coverImage}
          imageStyle={styles.imageStyle}
        >
          <View style={styles.overlay}>
            <View style={styles.dateContainer}>
              <Text style={styles.month}>
                {format(new Date(event.startDate), 'MMM')}
              </Text>
              <Text style={styles.day}>
                {format(new Date(event.startDate), 'd')}
              </Text>
            </View>
            
            {event.isFeatured && (
              <Chip icon="star" style={styles.featuredChip}>
                Featured
              </Chip>
            )}
          </View>
        </ImageBackground>
        
        <Card.Content style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
            <Chip
              style={[
                styles.statusChip,
                {
                  backgroundColor: event.startDate > new Date().toISOString()
                    ? COLORS.primary
                    : event.endDate > new Date().toISOString()
                      ? COLORS.success
                      : COLORS.gray
                }
              ]}
              textStyle={styles.statusText}
            >
              {getDaysRemaining(event.startDate > new Date().toISOString() ? event.startDate : event.endDate)}
            </Chip>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="calendar-range" size={16} color={COLORS.primary} />
              <Text style={styles.infoText}>
                {formatEventDate(event.startDate, event.endDate)}
              </Text>
            </View>
            
            {event.location && (
              <View style={styles.infoItem}>
                <MaterialCommunityIcons name="map-marker" size={16} color={COLORS.primary} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {event.location.name}
                </Text>
              </View>
            )}
          </View>
          
          <Text style={styles.description} numberOfLines={2}>
            {event.description}
          </Text>
          
          <View style={styles.categoryContainer}>
            {event.categories && event.categories.map((category, index) => (
              <Chip
                key={index}
                style={styles.categoryChip}
                textStyle={styles.categoryText}
              >
                {category}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Standard card styles
  card: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  coverImage: {
    height: 180,
  },
  imageStyle: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  overlay: {
    flex: 1,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  dateContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  month: {
    ...FONTS.body4,
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  day: {
    ...FONTS.h2,
    color: COLORS.primary,
  },
  featuredChip: {
    backgroundColor: COLORS.primary,
  },
  content: {
    padding: 8,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    ...FONTS.h3,
    flex: 1,
    marginRight: 8,
  },
  statusChip: {
    height: 28,
  },
  statusText: {
    ...FONTS.body4,
    color: COLORS.white,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  infoText: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginLeft: 4,
  },
  description: {
    ...FONTS.body4,
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: COLORS.lightGray,
  },
  categoryText: {
    ...FONTS.body4,
  },
  
  // Compact card styles
  compactCard: {
    width: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  compactImage: {
    height: 100,
    width: '100%',
  },
  compactImageStyle: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  compactOverlay: {
    flex: 1,
    padding: 8,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  compactStatus: {
    height: 24,
  },
  compactStatusText: {
    ...FONTS.body4,
    color: COLORS.white,
  },
  compactContent: {
    padding: 8,
  },
  compactTitle: {
    ...FONTS.body3Bold,
    marginBottom: 4,
  },
  compactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  compactDate: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginLeft: 4,
  },
  compactLocation: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginLeft: 4,
    flex: 1,
  },
});

export default EventCard;