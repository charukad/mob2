import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Card, ActivityIndicator, Divider, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, addDays, isSameDay } from 'date-fns';

import { COLORS, FONTS } from '../../constants/theme';

// Weather condition icons mapping
const WEATHER_ICONS = {
  clear: 'weather-sunny',
  cloudy: 'weather-cloudy',
  partlyCloudy: 'weather-partly-cloudy',
  rain: 'weather-pouring',
  thunderstorm: 'weather-lightning-rainy',
  snow: 'weather-snowy',
  mist: 'weather-fog',
  unknown: 'weather-cloudy-alert',
};

// Mock weather data (in a real app, this would come from a weather API)
const getMockWeatherData = (startDate, days = 7) => {
  const weatherData = [];
  const conditions = ['clear', 'cloudy', 'partlyCloudy', 'rain', 'thunderstorm'];
  
  for (let i = 0; i < days; i++) {
    const date = addDays(new Date(startDate), i);
    
    // Generate random weather
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
    const minTemp = Math.floor(Math.random() * 10) + 20; // 20-29°C
    const maxTemp = minTemp + Math.floor(Math.random() * 5) + 1; // 1-5°C higher
    const precipitation = randomCondition === 'rain' || randomCondition === 'thunderstorm'
      ? Math.floor(Math.random() * 70) + 10 // 10-80% chance
      : Math.floor(Math.random() * 20); // 0-20% chance
    
    weatherData.push({
      date,
      condition: randomCondition,
      minTemp,
      maxTemp,
      precipitation,
      humidity: Math.floor(Math.random() * 30) + 60, // 60-90%
      windSpeed: Math.floor(Math.random() * 20) + 5, // 5-25 km/h
      hourly: generateHourlyForecast(randomCondition, minTemp, maxTemp),
    });
  }
  
  return weatherData;
};

// Generate mock hourly forecast
const generateHourlyForecast = (mainCondition, minTemp, maxTemp) => {
  const hourlyData = [];
  const conditions = [mainCondition];
  
  // Add some variation to the hourly conditions
  if (mainCondition === 'clear') {
    conditions.push('partlyCloudy');
  } else if (mainCondition === 'cloudy') {
    conditions.push('partlyCloudy', 'rain');
  } else if (mainCondition === 'rain') {
    conditions.push('cloudy', 'thunderstorm');
  }
  
  for (let hour = 0; hour < 24; hour += 3) { // Every 3 hours
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    const temp = Math.floor(minTemp + (Math.random() * (maxTemp - minTemp)));
    
    hourlyData.push({
      hour,
      condition,
      temperature: temp,
      precipitation: condition === 'rain' || condition === 'thunderstorm'
        ? Math.floor(Math.random() * 70) + 10
        : Math.floor(Math.random() * 20),
    });
  }
  
  return hourlyData;
};

const WeatherForecast = ({ startDate, endDate, compact = false }) => {
  const [weatherData, setWeatherData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(0); // Index of selected day
  
  // Fetch weather data when component mounts
  useEffect(() => {
    const fetchWeatherData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // In a real app, this would be an API call to a weather service
        // For now, we'll use mock data
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        const data = getMockWeatherData(start, days);
        setWeatherData(data);
      } catch (err) {
        console.error('Error fetching weather data:', err);
        setError('Unable to load weather forecast. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (startDate && endDate) {
      fetchWeatherData();
    }
  }, [startDate, endDate]);
  
  // Get weather icon based on condition
  const getWeatherIcon = (condition) => {
    return WEATHER_ICONS[condition] || WEATHER_ICONS.unknown;
  };
  
  // Render daily weather item
  const renderDailyWeatherItem = (day, index) => {
    const isToday = isSameDay(day.date, new Date());
    
    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.dailyItem,
          selectedDay === index && styles.selectedDailyItem
        ]}
        onPress={() => setSelectedDay(index)}
      >
        <Text style={[
          styles.dayLabel,
          isToday && styles.todayLabel,
          selectedDay === index && styles.selectedDayText
        ]}>
          {isToday ? 'Today' : format(day.date, 'EEE')}
        </Text>
        <Text style={[
          styles.dateLabel,
          selectedDay === index && styles.selectedDayText
        ]}>
          {format(day.date, 'd MMM')}
        </Text>
        <MaterialCommunityIcons
          name={getWeatherIcon(day.condition)}
          size={24}
          color={selectedDay === index ? COLORS.white : COLORS.darkGray}
          style={styles.weatherIcon}
        />
        <Text style={[
          styles.tempLabel,
          selectedDay === index && styles.selectedDayText
        ]}>
          {day.maxTemp}° / {day.minTemp}°
        </Text>
        <View style={styles.precipitationContainer}>
          <MaterialCommunityIcons
            name="water"
            size={14}
            color={selectedDay === index ? COLORS.white : COLORS.primary}
          />
          <Text style={[
            styles.precipitationLabel,
            selectedDay === index && styles.selectedDayText
          ]}>
            {day.precipitation}%
          </Text>
        </View>
      </TouchableOpacity>
    );
  };
  
  // Render hourly forecast
  const renderHourlyForecast = () => {
    if (!weatherData[selectedDay] || !weatherData[selectedDay].hourly) {
      return null;
    }
    
    return (
      <View style={styles.hourlyContainer}>
        <Text style={styles.sectionTitle}>Hourly Forecast</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hourlyScrollContent}
        >
          {weatherData[selectedDay].hourly.map((hour, index) => (
            <View key={index} style={styles.hourlyItem}>
              <Text style={styles.hourLabel}>
                {hour.hour === 0 ? '12 AM' : hour.hour < 12 ? `${hour.hour} AM` : hour.hour === 12 ? '12 PM' : `${hour.hour - 12} PM`}
              </Text>
              <MaterialCommunityIcons
                name={getWeatherIcon(hour.condition)}
                size={24}
                color={COLORS.darkGray}
                style={styles.hourlyIcon}
              />
              <Text style={styles.hourlyTemp}>{hour.temperature}°</Text>
              <View style={styles.hourlyPrecipitation}>
                <MaterialCommunityIcons name="water" size={12} color={COLORS.primary} />
                <Text style={styles.hourlyPrecipitationLabel}>{hour.precipitation}%</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };
  
  // Render detailed forecast
  const renderDetailedForecast = () => {
    if (!weatherData[selectedDay]) {
      return null;
    }
    
    const selected = weatherData[selectedDay];
    
    return (
      <View style={styles.detailedContainer}>
        <Text style={styles.sectionTitle}>Detailed Forecast</Text>
        <Text style={styles.forecastDate}>
          {format(selected.date, 'EEEE, MMMM d, yyyy')}
        </Text>
        
        <View style={styles.weatherSummary}>
          <View style={styles.weatherIconLarge}>
            <MaterialCommunityIcons
              name={getWeatherIcon(selected.condition)}
              size={64}
              color={COLORS.primary}
            />
          </View>
          
          <View style={styles.weatherDetails}>
            <Text style={styles.weatherCondition}>
              {selected.condition.charAt(0).toUpperCase() + selected.condition.slice(1)}
            </Text>
            <Text style={styles.tempRange}>
              {selected.maxTemp}°C / {selected.minTemp}°C
            </Text>
            
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="water" size={16} color={COLORS.primary} />
                <Text style={styles.detailValue}>{selected.precipitation}%</Text>
                <Text style={styles.detailLabel}>Precipitation</Text>
              </View>
              
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="water-percent" size={16} color={COLORS.primary} />
                <Text style={styles.detailValue}>{selected.humidity}%</Text>
                <Text style={styles.detailLabel}>Humidity</Text>
              </View>
              
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="weather-windy" size={16} color={COLORS.primary} />
                <Text style={styles.detailValue}>{selected.windSpeed} km/h</Text>
                <Text style={styles.detailLabel}>Wind</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.forecastSummary}>
          <Text style={styles.forecastText}>
            {selected.condition === 'clear' && "Clear skies throughout the day. Perfect for outdoor activities."}
            {selected.condition === 'cloudy' && "Cloudy throughout the day. Good for outdoor activities that don't require bright sunshine."}
            {selected.condition === 'partlyCloudy' && "Partly cloudy with some sunshine. Good day for most outdoor activities."}
            {selected.condition === 'rain' && "Rainy conditions expected. Consider indoor activities or bring rain gear."}
            {selected.condition === 'thunderstorm' && "Thunderstorms expected. Consider rescheduling outdoor activities."}
          </Text>
        </View>
      </View>
    );
  };
  
  // Compact version only shows daily forecast row
  if (compact) {
    return (
      <Card style={styles.compactCard}>
        <Card.Content style={styles.compactContent}>
          <Text style={styles.compactTitle}>Weather Forecast</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading forecast...</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dailyScrollContent}
            >
              {weatherData.map((day, index) => renderDailyWeatherItem(day, index))}
            </ScrollView>
          )}
        </Card.Content>
      </Card>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weather Forecast</Text>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading forecast...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="weather-cloudy-alert" size={48} color={COLORS.gray} />
          <Text style={styles.errorText}>{error}</Text>
          <Button
            mode="contained"
            onPress={() => setLoading(true)}
            style={styles.retryButton}
          >
            Retry
          </Button>
        </View>
      ) : (
        <View>
          {/* Daily forecast row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dailyScrollContent}
          >
            {weatherData.map((day, index) => renderDailyWeatherItem(day, index))}
          </ScrollView>
          
          <Divider style={styles.divider} />
          
          {/* Hourly forecast for selected day */}
          {renderHourlyForecast()}
          
          <Divider style={styles.divider} />
          
          {/* Detailed forecast for selected day */}
          {renderDetailedForecast()}
          
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              Note: This is a simulated forecast for demonstration purposes only.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: COLORS.white,
  },
  title: {
    ...FONTS.h2,
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    ...FONTS.body3,
    color: COLORS.gray,
    marginTop: 12,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    ...FONTS.body3,
    color: COLORS.error,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
  },
  dailyScrollContent: {
    paddingRight: 16,
  },
  dailyItem: {
    alignItems: 'center',
    marginRight: 16,
    padding: 12,
    borderRadius: 8,
    width: 80,
    backgroundColor: COLORS.lightGray,
  },
  selectedDailyItem: {
    backgroundColor: COLORS.primary,
  },
  dayLabel: {
    ...FONTS.body4Bold,
    marginBottom: 2,
  },
  todayLabel: {
    color: COLORS.primary,
  },
  dateLabel: {
    ...FONTS.body4,
    marginBottom: 8,
  },
  weatherIcon: {
    marginVertical: 8,
  },
  tempLabel: {
    ...FONTS.body4,
    marginBottom: 8,
  },
  precipitationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  precipitationLabel: {
    ...FONTS.body4,
    marginLeft: 4,
  },
  selectedDayText: {
    color: COLORS.white,
  },
  divider: {
    marginVertical: 16,
  },
  hourlyContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    ...FONTS.h3,
    marginBottom: 16,
  },
  hourlyScrollContent: {
    paddingRight: 16,
  },
  hourlyItem: {
    alignItems: 'center',
    marginRight: 16,
    padding: 12,
    borderRadius: 8,
    width: 70,
    backgroundColor: COLORS.lightGray,
  },
  hourLabel: {
    ...FONTS.body4,
    marginBottom: 8,
  },
  hourlyIcon: {
    marginVertical: 8,
  },
  hourlyTemp: {
    ...FONTS.body3Bold,
    marginBottom: 8,
  },
  hourlyPrecipitation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hourlyPrecipitationLabel: {
    ...FONTS.body4,
    marginLeft: 2,
  },
  detailedContainer: {
    marginBottom: 16,
  },
  forecastDate: {
    ...FONTS.body3,
    color: COLORS.gray,
    marginBottom: 16,
  },
  weatherSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  weatherIconLarge: {
    marginRight: 24,
  },
  weatherDetails: {
    flex: 1,
  },
  weatherCondition: {
    ...FONTS.h3,
    marginBottom: 4,
  },
  tempRange: {
    ...FONTS.body2Bold,
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailValue: {
    ...FONTS.body3Bold,
    marginTop: 4,
    marginBottom: 2,
  },
  detailLabel: {
    ...FONTS.body4,
    color: COLORS.gray,
  },
  forecastSummary: {
    backgroundColor: COLORS.lightGray,
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  forecastText: {
    ...FONTS.body3,
  },
  disclaimer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
  },
  disclaimerText: {
    ...FONTS.body4,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  // Compact styles
  compactCard: {
    marginBottom: 16,
  },
  compactContent: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  compactTitle: {
    ...FONTS.h4,
    marginBottom: 12,
  },
});

export default WeatherForecast;