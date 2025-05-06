import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Text, RefreshControl } from 'react-native';
import { Appbar, Chip, Divider, FAB } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import AlertCard from '../../components/alerts/AlertCard';
import WeatherAlertBanner from '../../components/alerts/WeatherAlertBanner';
import { fetchAlerts, dismissAlert } from '../../store/slices/alertsSlice';

const AlertsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { alerts, loading, error } = useSelector(state => state.alerts);
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedAlertId, setExpandedAlertId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showMap, setShowMap] = useState(false);
  
  useFocusEffect(
    React.useCallback(() => {
      dispatch(fetchAlerts());
    }, [dispatch])
  );
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchAlerts());
    setRefreshing(false);
  };
  
  // Get filtered alerts based on selected type
  const getFilteredAlerts = () => {
    if (activeFilter === 'all') {
      return alerts;
    }
    return alerts.filter(alert => alert.type === activeFilter);
  };
  
  // Toggle expanded alert
  const toggleAlert = (alertId) => {
    setExpandedAlertId(expandedAlertId === alertId ? null : alertId);
  };
  
  // Handle alert dismissal
  const handleDismissAlert = (alertId) => {
    dispatch(dismissAlert(alertId));
  };
  
  // Generate alert counts for filters
  const getAlertCount = (type) => {
    if (type === 'all') {
      return alerts.length;
    }
    return alerts.filter(alert => alert.type === type).length;
  };
  
  // Render filter chips
  const renderFilterChips = () => {
    const filters = [
      { id: 'all', label: 'All' },
      { id: 'weather', label: 'Weather' },
      { id: 'safety', label: 'Safety' },
      { id: 'traffic', label: 'Traffic' },
      { id: 'health', label: 'Health' },
      { id: 'transportation', label: 'Transport' },
    ];
    
    return (
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipContainer}
        >
          {filters.map(filter => (
            <Chip
              key={filter.id}
              selected={activeFilter === filter.id}
              onPress={() => setActiveFilter(filter.id)}
              style={[
                styles.filterChip,
                activeFilter === filter.id && styles.activeFilterChip
              ]}
              textStyle={activeFilter === filter.id ? styles.activeFilterText : null}
            >
              {filter.label} ({getAlertCount(filter.id)})
            </Chip>
          ))}
        </ScrollView>
      </View>
    );
  };
  
  // Render alert map if enabled
  const renderMap = () => {
    if (!showMap || getFilteredAlerts().length === 0) return null;
    
    const alertsWithCoordinates = getFilteredAlerts().filter(
      alert => alert.latitude && alert.longitude
    );
    
    if (alertsWithCoordinates.length === 0) return null;
    
    // Get center coordinates for map
    const initialRegion = {
      latitude: alertsWithCoordinates[0].latitude,
      longitude: alertsWithCoordinates[0].longitude,
      latitudeDelta: 0.5,
      longitudeDelta: 0.5,
    };
    
    return (
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={initialRegion}
        >
          {alertsWithCoordinates.map(alert => (
            <Marker
              key={alert.id}
              coordinate={{
                latitude: alert.latitude,
                longitude: alert.longitude
              }}
              title={alert.title}
              description={alert.description}
            />
          ))}
        </MapView>
      </View>
    );
  };
  
  // Render Weather Alerts section if present
  const renderWeatherAlerts = () => {
    const weatherAlerts = getFilteredAlerts().filter(
      alert => alert.type === 'weather'
    );
    
    if (weatherAlerts.length === 0 || activeFilter !== 'all' && activeFilter !== 'weather') {
      return null;
    }
    
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Weather Alerts</Text>
        {weatherAlerts.map(alert => (
          <WeatherAlertBanner
            key={alert.id}
            alert={alert}
            onDismiss={handleDismissAlert}
          />
        ))}
      </View>
    );
  };
  
  // Render all other alerts
  const renderAlerts = () => {
    const filteredAlerts = getFilteredAlerts();
    const otherAlerts = activeFilter === 'all' || activeFilter === 'weather'
      ? filteredAlerts.filter(alert => alert.type !== 'weather')
      : filteredAlerts;
    
    if (otherAlerts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No {activeFilter === 'all' ? '' : activeFilter} alerts at this time
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.alertsContainer}>
        {activeFilter === 'all' && otherAlerts.length > 0 && (
          <Text style={styles.sectionTitle}>Other Alerts</Text>
        )}
        
        {otherAlerts.map(alert => (
          <AlertCard
            key={alert.id}
            alert={alert}
            expanded={expandedAlertId === alert.id}
            onPress={() => toggleAlert(alert.id)}
            onDismiss={handleDismissAlert}
          />
        ))}
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Alerts & Advisories" />
        <Appbar.Action 
          icon={showMap ? 'format-list-bulleted' : 'map'} 
          onPress={() => setShowMap(!showMap)} 
        />
        <Appbar.Action 
          icon="cog"
          onPress={() => navigation.navigate('NotificationSettings')}
        />
      </Appbar.Header>
      
      {renderFilterChips()}
      <Divider />
      
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <>
          {renderMap()}
          
          {!showMap && (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
              {renderWeatherAlerts()}
              {renderAlerts()}
              <View style={styles.footer} />
            </ScrollView>
          )}
          
          <FAB
            style={styles.fab}
            icon="bell-check"
            label="Mark All Read"
            visible={getFilteredAlerts().length > 0}
            onPress={() => {
              getFilteredAlerts().forEach(alert => {
                dispatch(dismissAlert(alert.id));
              });
            }}
          />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  filterContainer: {
    backgroundColor: 'white',
  },
  chipContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: '#E3F2FD',
  },
  activeFilterText: {
    color: '#2196F3',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  sectionContainer: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  alertsContainer: {
    marginTop: 8,
  },
  mapContainer: {
    height: '100%',
    width: '100%',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
    textAlign: 'center',
  },
  footer: {
    height: 72,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#2196F3',
  },
});

export default AlertsScreen;