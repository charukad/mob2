import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const WeatherAlertBanner = ({ 
  alert, 
  onDismiss,
  style 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const navigation = useNavigation();
  
  // Weather condition icons
  const weatherIcons = {
    storm: 'weather-lightning',
    rain: 'weather-pouring',
    flood: 'home-flood',
    wind: 'weather-windy',
    snow: 'weather-snowy-heavy',
    extreme: 'weather-hurricane',
    fog: 'weather-fog',
    cold: 'snowflake',
    heat: 'weather-sunny-alert',
    default: 'weather-cloudy-alert'
  };
  
  // Get appropriate icon based on weather condition
  const getWeatherIcon = () => {
    return weatherIcons[alert.condition] || weatherIcons.default;
  };
  
  // Get color based on alert severity
  const getSeverityColor = () => {
    const severityColors = {
      advisory: '#FFC107',    // Yellow/Amber for advisory
      watch: '#FF9800',       // Orange for watch
      warning: '#F44336',     // Red for warning
    };
    
    return severityColors[alert.severity] || severityColors.advisory;
  };
  
  // Toggle expanded state with animation
  const toggleExpand = () => {
    Animated.timing(animation, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    setExpanded(!expanded);
  };
  
  // Calculate dynamic height for animation
  const maxHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [64, 180],  // Adjust end value based on content
  });
  
  // Handle navigation to detailed weather screen
  const handleViewDetails = () => {
    if (onDismiss) {
      onDismiss(alert.id);
    }
    
    navigation.navigate('WeatherDetail', { alertId: alert.id });
  };
  
  return (
    <Animated.View 
      style={[
        styles.container, 
        { maxHeight, borderLeftColor: getSeverityColor() },
        style
      ]}
    >
      <TouchableOpacity 
        style={styles.header}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons 
            name={getWeatherIcon()} 
            size={24} 
            color={getSeverityColor()} 
          />
        </View>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{alert.title}</Text>
          <Text style={styles.location}>{alert.location}</Text>
        </View>
        
        <MaterialCommunityIcons 
          name={expanded ? 'chevron-up' : 'chevron-down'} 
          size={24} 
          color="#757575"
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.description}>{alert.description}</Text>
          
          <View style={styles.timeFrame}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#757575" />
            <Text style={styles.timeText}>
              {alert.startTime} - {alert.endTime}
            </Text>
          </View>
          
          <View style={styles.buttonContainer}>
            {onDismiss && (
              <TouchableOpacity 
                style={[styles.button, styles.dismissButton]}
                onPress={() => onDismiss(alert.id)}
              >
                <Text style={styles.dismissButtonText}>Dismiss</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.button, styles.detailsButton, { backgroundColor: getSeverityColor() }]}
              onPress={handleViewDetails}
            >
              <Text style={styles.detailsButtonText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderLeftWidth: 4,
    elevation: 2,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  location: {
    fontSize: 13,
    color: '#757575',
  },
  expandedContent: {
    padding: 16,
    paddingTop: 0,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  timeFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeText: {
    fontSize: 13,
    color: '#757575',
    marginLeft: 6,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginLeft: 8,
  },
  dismissButton: {
    backgroundColor: '#E0E0E0',
  },
  dismissButtonText: {
    color: '#424242',
    fontWeight: '500',
  },
  detailsButton: {
    // Color set dynamically based on severity
  },
  detailsButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});

export default WeatherAlertBanner;