const ENV = {
  dev: {
    apiUrl: "http://localhost:5008/api",
    googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY",
    enableAnalytics: false,
    debugMode: true
  },
  staging: {
    apiUrl: "https://staging-api.srilankaguide.com/api",
    googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY",
    enableAnalytics: true,
    debugMode: false
  },
  prod: {
    apiUrl: "https://api.srilankaguide.com/api",
    googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY",
    enableAnalytics: true,
    debugMode: false
  }
};

// Export the right environment
const getEnvVars = (env = process.env.NODE_ENV || 'development') => {
  if (env === 'production') {
    return ENV.prod;
  } else if (env === 'staging') {
    return ENV.staging;
  } else {
    return ENV.dev;
  }
};

export default getEnvVars; 