import React from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity } from 'react-native';
import { Card, Badge, IconButton } from 'react-native-paper';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Import theme constants
import { COLORS, SIZES, FONTS } from '../../constants/theme';

const ItineraryCard = ({ itinerary, onEdit, onShare, onDelete }) => {
  const navigation = useNavigation();
  
  // Calculate trip duration in days
  const startDate = new Date(itinerary.startDate);
  const endDate = new Date(itinerary.endDate);
  const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  
  // Determine status badge color and text
  const getBadgeDetails = () => {
    const today = new Date();
    
    if (today < startDate) {
      return { color: COLORS.info, text: 'Planning' };
    } else if (today >= startDate && today <= endDate) {
      return { color: COLORS.success, text: 'Active' };
    } else {
      return { color: COLORS.secondary, text: 'Completed' };
    }
  };
  
  const badgeDetails = getBadgeDetails();
  
  // Format date range display
  const dateRangeText = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
  
  return (
    <Card 
      style={styles.card}
      onPress={() => navigation.navigate('ItineraryDetail', { itineraryId: itinerary._id })}
    >
      <ImageBackground
        source={{ uri: itinerary.coverImage || 'https://res.cloudinary.com/demo/image/upload/placeholder_travel.jpg' }}
        style={styles.coverImage}
        imageStyle={styles.coverImageStyle}
      >
        <View style={styles.overlay}>
          <Badge style={[styles.badge, { backgroundColor: badgeDetails.color }]}>
            {badgeDetails.text}
          </Badge>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={2}>{itinerary.title}</Text>
            <Text style={styles.dateRange}>{dateRangeText}</Text>
            
            <View style={styles.statsContainer}>
              <View style={styles.stat}>
                <MaterialCommunityIcons name="calendar-range" size={16} color={COLORS.white} />
                <Text style={styles.statText}>{durationDays} days</Text>
              </View>
              
              <View style={styles.stat}>
                <MaterialCommunityIcons name="map-marker" size={16} color={COLORS.white} />
                <Text style={styles.statText}>{itinerary.items?.length || 0} places</Text>
              </View>
            </View>
          </View>
        </View>
      </ImageBackground>
      
      <Card.Actions style={styles.cardActions}>
        <IconButton
          icon="pencil-outline"
          color={COLORS.primary}
          size={20}
          onPress={() => onEdit && onEdit(itinerary._id)}
        />
        <IconButton
          icon="share-outline"
          color={COLORS.primary}
          size={20}
          onPress={() => onShare && onShare(itinerary._id)}
        />
        <IconButton
          icon="delete-outline"
          color={COLORS.error}
          size={20}
          onPress={() => onDelete && onDelete(itinerary._id)}
        />
      </Card.Actions>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
  },
  coverImage: {
    height: 180,
    width: '100%',
  },
  coverImageStyle: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16,
    justifyContent: 'space-between',
  },
  badge: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    width: '100%',
  },
  title: {
    ...FONTS.h2,
    
    marginBottom: 4,
  },
  dateRange: {
    ...FONTS.body4
    //color: colors.white
,
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    ...FONTS.body4,
    //color: COLORS.white,
    marginLeft: 4,
  },
  cardActions: {
    justifyContent: 'flex-end',
    paddingRight: 8,
  },
});

export default ItineraryCard;