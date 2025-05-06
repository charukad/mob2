import axios from '../api/axios';
import Constants from 'expo-constants';

// OpenWeatherMap API key from environment variables
const WEATHER_API_KEY = Constants.manifest?.extra?.weatherApiKey || '';

class WeatherService {
  // Get current weather for a location
  async getCurrentWeather(latitude, longitude) {
    try {
      // First try to get from our backend cache
      const backendResponse = await axios.get(`/api/weather/current`, {
        params: { latitude, longitude }
      });
      
      return backendResponse.data;
    } catch (backendError) {
      // If backend fails, try direct API call as fallback
      try {
        if (!WEATHER_API_KEY) {
          throw new Error('Weather API key not configured');
        }
        
        const apiResponse = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather`, {
            params: {
              lat: latitude,
              lon: longitude,
              appid: WEATHER_API_KEY,
              units: 'metric'
            }
          }
        );
        
        // Format the response to match our expected structure
        return this.formatCurrentWeatherData(apiResponse.data);
      } catch (apiError) {
        console.error('Error fetching current weather:', apiError);
        throw apiError;
      }
    }
  }
  
  // Get weather forecast for a location
  async getWeatherForecast(latitude, longitude, days = 5) {
    try {
      // First try to get from our backend cache
      const backendResponse = await axios.get(`/api/weather/forecast`, {
        params: { latitude, longitude, days }
      });
      
      return backendResponse.data;
    } catch (backendError) {
      // If backend fails, try direct API call as fallback
      try {
        if (!WEATHER_API_KEY) {
          throw new Error('Weather API key not configured');
        }
        
        const apiResponse = await axios.get(
          `https://api.openweathermap.org/data/2.5/forecast`, {
            params: {
              lat: latitude,
              lon: longitude,
              appid: WEATHER_API_KEY,
              units: 'metric',
              cnt: days * 8 // Approximation for days (3-hour intervals)
            }
          }
        );
        
        // Format the response to match our expected structure
        return this.formatForecastData(apiResponse.data);
      } catch (apiError) {
        console.error('Error fetching weather forecast:', apiError);
        throw apiError;
      }
    }
  }
  
  // Get weather alerts for multiple locations
  async getWeatherAlerts(locations) {
    try {
      // Fetch alerts from backend which aggregates data
      const response = await axios.post('/api/weather/alerts', { locations });
      return response.data.alerts;
    } catch (error) {
      console.error('Error fetching weather alerts:', error);
      
      // If backend fails, try to fetch for each location directly
      try {
        if (!WEATHER_API_KEY) {
          throw new Error('Weather API key not configured');
        }
        
        // Only attempt direct API if we have 5 or fewer locations to check
        if (locations.length <= 5) {
          const alerts = [];
          
          for (const location of locations) {
            try {
              const response = await axios.get(
                `https://api.openweathermap.org/data/2.5/onecall`, {
                  params: {
                    lat: location.latitude,
                    lon: location.longitude,
                    exclude: 'current,minutely,hourly,daily',
                    appid: WEATHER_API_KEY
                  }
                }
              );
              
              // If alerts exist in response, format and add them
              if (response.data.alerts && response.data.alerts.length > 0) {
                const formattedAlerts = this.formatWeatherAlerts(
                  response.data.alerts,
                  location
                );
                alerts.push(...formattedAlerts);
              }
            } catch (locationError) {
              console.error(`Error fetching alerts for location ${location.name}:`, locationError);
              // Continue with other locations
            }
          }
          
          return alerts;
        }
        
        return [];
      } catch (apiError) {
        console.error('Error fetching direct weather alerts:', apiError);
        return [];
      }
    }
  }
  
  // Format OpenWeatherMap current data to match our app's structure
  formatCurrentWeatherData(data) {
    return {
      location: {
        name: data.name,
        country: data.sys.country,
        latitude: data.coord.lat,
        longitude: data.coord.lon
      },
      current: {
        temperature: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        windDirection: data.wind.deg,
        pressure: data.main.pressure,
        condition: data.weather[0].main,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        timestamp: new Date(data.dt * 1000).toISOString()
      }
    };
  }
  
  // Format OpenWeatherMap forecast data to match our app's structure
  formatForecastData(data) {
    // Group by date (daily forecasts)
    const dailyForecasts = {};
    
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000).toISOString().split('T')[0];
      
      if (!dailyForecasts[date]) {
        dailyForecasts[date] = [];
      }
      
      dailyForecasts[date].push({
        time: new Date(item.dt * 1000).toISOString(),
        temperature: Math.round(item.main.temp),
        feelsLike: Math.round(item.main.feels_like),
        humidity: item.main.humidity,
        windSpeed: item.wind.speed,
        windDirection: item.wind.deg,
        condition: item.weather[0].main,
        description: item.weather[0].description,
        icon: item.weather[0].icon,
        rainProbability: item.pop * 100, // Probability of precipitation (0-1)
      });
    });
    
    // Convert to array format
    const forecast = Object.keys(dailyForecasts).map(date => {
      const hourlyData = dailyForecasts[date];
      
      // Calculate daily min/max
      const temperatures = hourlyData.map(hour => hour.temperature);
      
      return {
        date,
        minTemperature: Math.min(...temperatures),
        maxTemperature: Math.max(...temperatures),
        // Use noon weather or first available as the day's condition
        condition: (hourlyData.find(h => h.time.includes('T12:')) || hourlyData[0]).condition,
        icon: (hourlyData.find(h => h.time.includes('T12:')) || hourlyData[0]).icon,
        hourly: hourlyData
      };
    });
    
    return {
      location: {
        name: data.city.name,
        country: data.city.country,
        latitude: data.city.coord.lat,
        longitude: data.city.coord.lon
      },
      forecast
    };
  }
  
  // Format weather alerts from OpenWeatherMap to match our app's structure
  formatWeatherAlerts(alerts, location) {
    return alerts.map(alert => {
      // Map OpenWeatherMap event types to our condition types
      const conditionMap = {
        'Thunderstorm': 'storm',
        'Flood': 'flood',
        'Rain': 'rain',
        'Snow': 'snow',
        'Fog': 'fog',
        'High Temperature': 'heat',
        'Low Temperature': 'cold',
        'Wind': 'wind',
        'Tornado': 'extreme'
      };
      
      // Default to 'default' if no matching condition
      let condition = 'default';
      
      // Check if any of our mapped conditions appear in the event name
      for (const [key, value] of Object.entries(conditionMap)) {
        if (alert.event.includes(key)) {
          condition = value;
          break;
        }
      }
      
      // Map severity levels (differs by region/provider)
      let severity = 'advisory';
      if (alert.event.includes('Warning')) {
        severity = 'warning';
      } else if (alert.event.includes('Watch')) {
        severity = 'watch';
      }
      
      return {
        id: `weather-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'weather',
        title: alert.event,
        description: alert.description,
        severity,
        condition,
        location: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
        startTime: new Date(alert.start * 1000).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        endTime: new Date(alert.end * 1000).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        source: alert.sender_name,
        timestamp: new Date().toISOString(),
        actionable: true,
        actionRoute: 'WeatherDetail',
        actionParams: { locationId: location.id },
        actionText: 'View Weather Forecast'
      };
    });
  }
}

// Create and export singleton instance
const weatherService = new WeatherService();
export default weatherService;