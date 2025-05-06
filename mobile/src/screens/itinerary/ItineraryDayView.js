import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, ActivityIndicator, Button, Divider } from 'react-native-paper';
import { colors, spacing } from '../../constants/theme';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import moment from 'moment';
import EmptyState from '../common/EmptyState';

const ItineraryDayView = ({ 
  day, 
  items, 
  summary, 
  itineraryId, 
  isLoading, 
  onAddItem, 
  navigation, 
  date 
}) => {
  // Get icon based on item type
  const getItemIcon = (type) => {
    switch (type) {
      case 'activity':
        return <MaterialIcons name="location-pin" size={24} color={colors.primary} />;
      case 'transport':
        return <MaterialIcons name="directions-car" size={24} color={colors.info} />;
      case 'accommodation':
        return <MaterialIcons name="hotel" size={24} color={colors.success} />;
      case 'meal':
        return <MaterialIcons name="restaurant" size={24} color={colors.accent} />;
      case 'rest':
        return <MaterialIcons name="beach-access" size={24} color={colors.warning} />;
      default:
        return <MaterialIcons name="event-note" size={24} color={colors.textLight} />;
    }
  };

  // Format time from date
  const formatTime = (dateString) => {
    return moment(dateString).format('h:mm A');
  };

  // Calculate duration text
  const getDurationText = (startTime, endTime) => {
    const start = moment(startTime);
    const end = moment(endTime);
    const durationMinutes = moment.duration(end.diff(start)).asMinutes();
    
    if (durationMinutes < 60) {
      return `${Math.round(durationMinutes)}m`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = Math.round(durationMinutes % 60);
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  };

  // Handle item press
  const handleItemPress = (item) => {
    navigation.navigate('ItineraryItemDetail', {
      itineraryId,
      itemId: item._id
    });
  };

  // Handle add location from map
  const handleAddFromMap = () => {
    navigation.navigate('ExploreMap', {
      selectionMode: true,
      onSelectLocation: (location) => {
        navigation.navigate('AddItineraryItem', {
          itineraryId,
          type: 'activity',
          day,
          locationId: location._id
        });
      }
    });
  };

  // Sort items by start time
  const sortedItems = [...(items || [])].sort((a, b) => 
    moment(a.startTime).valueOf() - moment(b.startTime).valueOf()
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Loading activities...</Text>
      </View>
    );
  }

  if (sortedItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          icon="calendar-outline"
          title={`Day ${day} is Empty`}
          message="Start planning your day by adding activities, transport, accommodation, or meals."
          buttonText="Add Activity"
          onButtonPress={onAddItem}
          secondaryButtonText="Add from Map"
          onSecondaryButtonPress={handleAddFromMap}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Day Summary */}
      {summary && (
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryTitle}>Day Summary</Text>
            
            <View style={styles.summaryStats}>
              <View style={styles.summaryItem}>
                <Ionicons name="location" size={16} color={colors.primary} />
                <Text style={styles.summaryValue}>
                  {summary.summary.activities || 0} Activities
                </Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Ionicons name="car" size={16} color={colors.primary} />
                <Text style={styles.summaryValue}>
                  {summary.summary.transports || 0} Transports
                </Text>
              </View>
              
              <View style={styles.summaryItem}>
                <Ionicons name="restaurant" size={16} color={colors.primary} />
                <Text style={styles.summaryValue}>
                  {summary.summary.meals || 0} Meals
                </Text>
              </View>
            </View>
            
            <Divider style={styles.summaryDivider} />
            
            <View style={styles.summaryFooter}>
              {summary.totalDistance > 0 && (
                <View style={styles.summaryFooterItem}>
                  <MaterialCommunityIcons name="map-marker-distance" size={16} color={colors.textLight} />
                  <Text style={styles.summaryFooterText}>
                    {summary.totalDistance.toFixed(1)} km
                  </Text>
                </View>
              )}
              
              {summary.totalCost > 0 && (
                <View style={styles.summaryFooterItem}>
                  <Ionicons name="wallet" size={16} color={colors.textLight} />
                  <Text style={styles.summaryFooterText}>
                    {summary.totalCost.toLocaleString()} {summary.currency}
                  </Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Timeline */}
      <View style={styles.timeline}>
        {sortedItems.map((item, index) => (
          <TouchableOpacity
            key={item._id}
            style={styles.timelineItem}
            onPress={() => handleItemPress(item)}
          >
            {/* Time */}
            <View style={styles.timeColumn}>
              <Text style={styles.timeText}>{formatTime(item.startTime)}</Text>
              <Text style={styles.durationText}>
                {getDurationText(item.startTime, item.endTime)}
              </Text>
            </View>
            
            {/* Line */}
            <View style={styles.lineColumn}>
              <View style={[
                styles.iconCircle,
                { backgroundColor: getItemTypeColor(item.type) }
              ]}>
                {getItemIcon(item.type)}
              </View>
              {index < sortedItems.length - 1 && <View style={styles.verticalLine} />}
            </View>
            
            {/* Content */}
            <View style={styles.contentColumn}>
              <Card style={styles.itemCard}>
                <Card.Content>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  
                  {item.location && item.location.name && (
                    <View style={styles.locationRow}>
                      <Ionicons name="location" size={14} color={colors.primary} />
                      <Text style={styles.locationText}>{item.location.name}</Text>
                    </View>
                  )}
                  
                  {item.description && (
                    <Text style={styles.itemDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                  
                  {/* Additional info based on item type */}
                  {renderItemTypeInfo(item)}
                  
                  {/* Cost */}
                  {item.cost && item.cost.amount > 0 && (
                    <View style={styles.costContainer}>
                      <Text style={styles.costText}>
                        {item.cost.amount.toLocaleString()} {item.cost.currency}
                      </Text>
                    </View>
                  )}
                </Card.Content>
              </Card>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Add More Button */}
      <Button
        mode="outlined"
        icon="plus"
        onPress={onAddItem}
        style={styles.addMoreButton}
      >
        Add More
      </Button>
    </View>
  );
};

// Get color based on item type
const getItemTypeColor = (type) => {
  switch (type) {
    case 'activity':
      return colors.primary;
    case 'transport':
      return colors.info;
    case 'accommodation':
      return colors.success;
    case 'meal':
      return colors.accent;
    case 'rest':
      return colors.warning;
    default:
      return colors.textLight;
  }
};

// Render specific info based on item type
const renderItemTypeInfo = (item) => {
  switch (item.type) {
    case 'transport':
      if (item.transport) {
        return (
          <View style={styles.typeInfoContainer}>
            <View style={styles.transportInfo}>
              <Text style={styles.transportMethod}>
                {item.transport.method && item.transport.method.charAt(0).toUpperCase() + item.transport.method.slice(1)}
              </Text>
              {item.transport.from && item.transport.to && (
                <Text style={styles.transportRoute}>
                  {item.transport.from.name} → {item.transport.to.name}
                </Text>
              )}
            </View>
            {item.transport.distance && (
              <Text style={styles.distanceText}>
                {item.transport.distance.toFixed(1)} km
              </Text>
            )}
          </View>
        );
      }
      return null;
      
    case 'accommodation':
      if (item.accommodation) {
        return (
          <View style={styles.typeInfoContainer}>
            {item.accommodation.propertyType && (
              <Text style={styles.accommodationType}>
                {item.accommodation.propertyType.charAt(0).toUpperCase() + item.accommodation.propertyType.slice(1)}
              </Text>
            )}
            {item.accommodation.checkIn && item.accommodation.checkOut && (
              <Text style={styles.accommodationDates}>
                Check-in: {moment(item.accommodation.checkIn).format('h:mm A')}
                {' • '}
                Check-out: {moment(item.accommodation.checkOut).format('h:mm A')}
              </Text>
            )}
          </View>
        );
      }
      return null;
      
    case 'meal':
      if (item.meal) {
        return (
          <View style={styles.typeInfoContainer}>
            {item.meal.mealType && (
              <Text style={styles.mealType}>
                {item.meal.mealType.charAt(0).toUpperCase() + item.meal.mealType.slice(1)}
              </Text>
            )}
            {item.meal.cuisine && (
              <Text style={styles.cuisine}>
                Cuisine: {item.meal.cuisine}
              </Text>
            )}
          </View>
        );
      }
      return null;
      
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textLight,
  },
  emptyContainer: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  summaryCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryValue: {
    marginLeft: spacing.xs,
    fontSize: 12,
  },
  summaryDivider: {
    marginVertical: spacing.sm,
  },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryFooterText: {
    marginLeft: spacing.xs,
    fontSize: 12,
    color: colors.textLight,
  },
  timeline: {
    marginBottom: spacing.lg,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  timeColumn: {
    width: 70,
    paddingTop: spacing.sm,
    alignItems: 'center',
  },
  timeText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  durationText: {
    fontSize: 10,
    color: colors.textLight,
  },
  lineColumn: {
    width: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  verticalLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.divider,
    marginTop: 4,
    marginBottom: -spacing.md,
    marginLeft: 11, // Center the line with the circle
  },
  contentColumn: {
    flex: 1,
  },
  itemCard: {
    marginBottom: 0,
  },
  itemTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: colors.textLight,
    marginLeft: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  typeInfoContainer: {
    marginTop: 4,
    marginBottom: 4,
  },
  transportInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transportMethod: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.info,
  },
  transportRoute: {
    fontSize: 10,
    color: colors.textLight,
  },
  distanceText: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 2,
  },
  accommodationType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.success,
  },
  accommodationDates: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 2,
  },
  mealType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.accent,
  },
  cuisine: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 2,
  },
  costContainer: {
    alignSelf: 'flex-end',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    marginTop: spacing.xs,
  },
  costText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  addMoreButton: {
    marginVertical: spacing.md,
  },
});

export default ItineraryDayView;