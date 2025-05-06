import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Appbar, Card, Divider, Chip } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

import weatherService from '../../services/weatherService';

const screenWidth = Dimensions.get('window').width;

const WeatherDetailScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  
  // Get alert data if coming from an alert
  const { alertId, locationId } = route.params || {};
  const alert = useSelector(state => 
    state.alerts.alerts.find(a => a.id === alertId)
  );
  
  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        setLoading(true);
        
        let latitude, longitude, locationName;
        
        // Use location from alert if available
        if (alert) {
          latitude = alert.latitude;
          longitude = alert.longitude;
          locationName = alert.location;
        } 
        // Otherwise try to get from location ID
        else if (locationId) {
          // You would normally fetch the location data from your API
          // For now we'll use a placeholder
          const locationData = { latitude: 6.9271, longitude: 79.8612, name: 'Colombo' };
          latitude = locationData.latitude;
          longitude = locationData.longitude;
          locationName = locationData.name;
        } 
        // Fallback to Colombo
        else {
          latitude = 6.9271;
          longitude = 79.8612;
          locationName = 'Colombo';
        }
        
        // Fetch current weather and forecast
        const currentData = await weatherService.getCurrentWeather(latitude, longitude);
        const forecastData = await weatherService.getWeatherForecast(latitude, longitude, 5);
        
        setCurrentWeather({
          ...currentData.current,
          location: locationName || currentData.location.name
        });
        setForecast(forecastData.forecast);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching weather data:', err);
        setError('Failed to load weather data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchWeatherData();
  }, [alertId, locationId, alert]);
  
  // Get weather icon for a condition
  const getWeatherIcon = (condition) => {
    const iconMap = {
      'Clear': 'weather-sunny',
      'Clouds': 'weather-cloudy',
      'Rain': 'weather-rainy',
      'Drizzle': 'weather-pouring',
      'Thunderstorm': 'weather-lightning',
      'Snow': 'weather-snowy',
      'Mist': 'weather-fog',
      'Smoke': 'weather-hazy',
      'Haze': 'weather-hazy',
      'Dust': 'weather-hazy',
      'Fog': 'weather-fog',
      'Sand': 'weather-hazy',
      'Ash': 'weather-hazy',
      'Squall': 'weather-windy',
      'Tornado': 'weather-hurricane',
    };
    
    return iconMap[condition] || 'weather-cloudy';
  };
  
  // Get color based on temperature
  const getTemperatureColor = (temp) => {
    if (temp >= 30) return '#FF5722'; // Hot
    if (temp >= 25) return '#FF9800'; // Warm
    if (temp >= 20) return '#FFC107'; // Pleasant
    if (temp >= 15) return '#8BC34A'; // Cool
    if (temp >= 10) return '#03A9F4'; // Cold
    return '#2196F3'; // Very cold
  };
  
  // Render temperature chart
  const renderTemperatureChart = () => {
    if (!forecast || forecast.length === 0) return null;
    
    // Prepare data for chart (first 5 days)
    const chartData = {
      labels: forecast.slice(0, 5).map(day => {
        const date = new Date(day.date);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      }),
      datasets: [
        {
          data: forecast.slice(0, 5).map(day => day.maxTemperature),
          color: () => 'rgba(255, 87, 34, 0.8)', // Orange/red for max temp
          strokeWidth: 2,
        },
        {
          data: forecast.slice(0, 5).map(day => day.minTemperature),
          color: () => 'rgba(33, 150, 243, 0.8)', // Blue for min temp
          strokeWidth: 2,
        },
      ],
    };
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>5-Day Temperature Forecast</Text>
        <LineChart
          data={chartData}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
            },
          }}
          bezier
          style={styles.chart}
        />
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: 'rgba(255, 87, 34, 0.8)' }]} />
            <Text style={styles.legendText}>Max Temperature</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: 'rgba(33, 150, 243, 0.8)' }]} />
            <Text style={styles.legendText}>Min Temperature</Text>
          </View>
        </View>
      </View>
    );
  };
  
  // Render current conditions
  const renderCurrentWeather = () => {
    if (!currentWeather) return null;
    
    return (
      <Card style={styles.currentWeatherCard}>
        <Card.Content>
          <View style={styles.currentHeader}>
            <Text style={styles.locationName}>{currentWeather.location}</Text>
            <Text style={styles.timestamp}>
              {new Date(currentWeather.timestamp).toLocaleString()}
            </Text>
          </View>
          
          <View style={styles.currentMain}>
            <View style={styles.tempContainer}>
              <Text style={[
                styles.currentTemp, 
                { color: getTemperatureColor(currentWeather.temperature) }
              ]}>
                {currentWeather.temperature}°C
              </Text>
              <Text style={styles.feelsLike}>
                Feels like {currentWeather.feelsLike}°C
              </Text>
            </View>
            
            <View style={styles.conditionContainer}>
              <MaterialCommunityIcons 
                name={getWeatherIcon(currentWeather.condition)} 
                size={64} 
                color={getTemperatureColor(currentWeather.temperature)} 
              />
              <Text style={styles.conditionText}>
                {currentWeather.description}
              </Text>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="water-percent" size={24} color="#03A9F4" />
              <Text style={styles.detailText}>
                Humidity: {currentWeather.humidity}%
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="weather-windy" size={24} color="#78909C" />
              <Text style={styles.detailText}>
                Wind: {currentWeather.windSpeed} m/s
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="gauge" size={24} color="#FF9800" />
              <Text style={styles.detailText}>
                Pressure: {currentWeather.pressure} hPa
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };
  
  // Render daily forecast
  const renderDailyForecast = () => {
    if (!forecast || forecast.length === 0) return null;
    
    return (
      <View style={styles.forecastContainer}>
        <Text style={styles.sectionTitle}>Daily Forecast</Text>
        
        {forecast.map((day, index) => (
          <Card key={index} style={styles.forecastCard}>
            <Card.Content>
              <View style={styles.forecastHeader}>
                <Text style={styles.forecastDay}>
                  {new Date(day.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric'
                  })}
                </Text>
                <MaterialCommunityIcons 
                  name={getWeatherIcon(day.condition)} 
                  size={36} 
                  color="#757575" 
                />
              </View>
              
              <View style={styles.tempRange}>
                <Text style={[styles.maxTemp, { color: getTemperatureColor(day.maxTemperature) }]}>
                  {day.maxTemperature}°C
                </Text>
                <Text style={styles.tempSeparator}>/</Text>
                <Text style={styles.minTemp}>
                  {day.minTemperature}°C
                </Text>
              </View>
              
              <View style={styles.conditionChips}>
                {day.hourly && day.hourly[0] && (
                  <Chip 
                    icon="weather-rainy" 
                    style={styles.chip}
                    textStyle={{ fontSize: 12 }}
                  >
                    {day.hourly[0].rainProbability}% rain
                  </Chip>
                )}
                <Chip 
                  icon="white-balance-sunny" 
                  style={styles.chip}
                  textStyle={{ fontSize: 12 }}
                >
                  {day.condition}
                </Chip>
              </View>
            </Card.Content>
          </Card>
        ))}
      </View>
    );
  };
  
  // Render alert banner if coming from an alert
  const renderAlertBanner = () => {
    if (!alert) return null;
    
    const severityColors = {
      advisory: '#FFC107',
      watch: '#FF9800',
      warning: '#F44336',
    };
    
    return (
      <Card style={[styles.alertCard, { borderLeftColor: severityColors[alert.severity] }]}>
        <Card.Content>
          <View style={styles.alertHeader}>
            <MaterialCommunityIcons 
              name="alert-circle" 
              size={24} 
              color={severityColors[alert.severity]} 
            />
            <Text style={styles.alertTitle}>{alert.title}</Text>
          </View>
          <Text style={styles.alertDescription}>{alert.description}</Text>
          {alert.source && (
            <Text style={styles.alertSource}>Source: {alert.source}</Text>
          )}
        </Card.Content>
      </Card>
    );
  };
  
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Weather Details" />
        <Appbar.Action icon="refresh" onPress={() => {
          setLoading(true);
          // Re-fetch weather data
          // This would normally call the same fetch function from useEffect
        }} />
      </Appbar.Header>
      
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderAlertBanner()}
          {renderCurrentWeather()}
          {renderTemperatureChart()}
          {renderDailyForecast()}
          <View style={styles.footer} />
        </ScrollView>
      )}
    </View>
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
  scrollContent: {
    padding: 16,
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
  },
  currentWeatherCard: {
    marginBottom: 16,
    elevation: 2,
  },
  currentHeader: {
    marginBottom: 8,
  },
  locationName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 12,
    color: '#757575',
  },
  currentMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  tempContainer: {
    flex: 1,
  },
  currentTemp: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  feelsLike: {
    fontSize: 16,
    color: '#757575',
  },
  conditionContainer: {
    alignItems: 'center',
  },
  conditionText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    textTransform: 'capitalize',
  },
  divider: {
    marginVertical: 16,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    width: '48%',
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 16,
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
  },
  forecastContainer: {
    marginBottom: 16,
  },
  forecastCard: {
    marginBottom: 8,
    elevation: 1,
  },
  forecastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forecastDay: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tempRange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  maxTemp: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tempSeparator: {
    fontSize: 18,
    marginHorizontal: 4,
    color: '#757575',
  },
  minTemp: {
    fontSize: 18,
    color: '#757575',
  },
  conditionChips: {
    flexDirection: 'row',
    marginTop: 8,
  },
  chip: {
    marginRight: 8,
    backgroundColor: '#E0E0E0',
  },
  alertCard: {
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  alertDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  alertSource: {
    fontSize: 12,
    color: '#757575',
    marginTop: 8,
    fontStyle: 'italic',
  },
  footer: {
    height: 24,
  },
});

export default WeatherDetailScreen;