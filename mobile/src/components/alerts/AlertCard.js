import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Severity level colors
const SEVERITY_COLORS = {
  low: '#FFC107',       // Yellow/Amber for low severity
  medium: '#FF9800',    // Orange for medium severity
  high: '#F44336',      // Red for high severity
  critical: '#D32F2F',  // Dark Red for critical alerts
};

const AlertCard = ({ 
  alert, 
  expanded = false, 
  onPress, 
  onDismiss 
}) => {
  const navigation = useNavigation();
  
  // Get appropriate icon based on alert type
  const getAlertIcon = () => {
    switch (alert.type) {
      case 'weather':
        return 'weather-lightning-rainy';
      case 'safety':
        return 'alert-circle';
      case 'traffic':
        return 'car';
      case 'health':
        return 'medical-bag';
      case 'transportation':
        return 'train-variant';
      default:
        return 'information';
    }
  };

  return (
    <Card 
      style={[
        styles.card, 
        { borderLeftColor: SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.low }
      ]}
      onPress={onPress}
    >
      <Card.Content>
        <View style={styles.headerContainer}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons 
              name={getAlertIcon()} 
              size={24} 
              color={SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.low} 
            />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{alert.title}</Text>
            <Text style={styles.timestamp}>{alert.timestamp}</Text>
          </View>
          {onDismiss && (
            <TouchableOpacity 
              onPress={() => onDismiss(alert.id)}
              style={styles.dismissButton}
            >
              <MaterialCommunityIcons name="close" size={20} color="#757575" />
            </TouchableOpacity>
          )}
        </View>
        
        {expanded ? (
          <View style={styles.detailsContainer}>
            <Divider style={styles.divider} />
            <Text style={styles.description}>{alert.description}</Text>
            
            {alert.affectedAreas && (
              <View style={styles.affectedAreaContainer}>
                <Text style={styles.sectionTitle}>Affected Areas:</Text>
                <Text style={styles.affectedAreas}>{alert.affectedAreas}</Text>
              </View>
            )}
            
            {alert.recommendations && (
              <View style={styles.recommendationsContainer}>
                <Text style={styles.sectionTitle}>Recommendations:</Text>
                <Text style={styles.recommendations}>{alert.recommendations}</Text>
              </View>
            )}
            
            {alert.source && (
              <Text style={styles.source}>Source: {alert.source}</Text>
            )}
            
            {alert.actionable && (
              <TouchableOpacity 
                style={[
                  styles.actionButton,
                  { backgroundColor: SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.low }
                ]}
                onPress={() => {
                  if (alert.actionRoute) {
                    navigation.navigate(alert.actionRoute, alert.actionParams || {});
                  }
                }}
              >
                <Text style={styles.actionButtonText}>{alert.actionText || 'View Details'}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text 
            numberOfLines={2} 
            style={styles.previewText}
          >
            {alert.description}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
    borderLeftWidth: 4,
    elevation: 2,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  timestamp: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  dismissButton: {
    padding: 4,
  },
  divider: {
    marginVertical: 8,
  },
  detailsContainer: {
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  previewText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  affectedAreaContainer: {
    marginVertical: 6,
  },
  recommendationsContainer: {
    marginVertical: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  affectedAreas: {
    fontSize: 14,
  },
  recommendations: {
    fontSize: 14,
  },
  source: {
    fontSize: 12,
    color: '#757575',
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  }
});

export default AlertCard;