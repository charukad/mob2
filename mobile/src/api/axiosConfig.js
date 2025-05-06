import axios from 'axios';
import { API_URL } from '../constants/api';

// Create axios instance with default config
const instance = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
instance.interceptors.request.use(
  config => {
    const method = config.method.toUpperCase();
    const url = `${config.baseURL}${config.url}`;
    
    // Log different information based on content type
    if (config.headers['Content-Type'] === 'multipart/form-data') {
      console.log(`🚀 API Request: ${method} ${url} [multipart/form-data]`);
      
      // Don't log the entire FormData (can be large with images)
      if (config.data instanceof FormData) {
        const keys = [];
        config.data.forEach((value, key) => {
          keys.push(key);
        });
        console.log('Form data keys:', keys);
      }
    } else {
      console.log(`🚀 API Request: ${method} ${url}`);
      
      // For small data, log it (but not for large payloads)
      if (config.data && typeof config.data === 'object' && Object.keys(config.data).length < 5) {
        console.log('Request data:', config.data);
      }

      // Log query parameters
      if (config.params) {
        console.log('Request params:', config.params);
      }
    }
    
    return config;
  },
  error => {
    console.log(`❌ API Request Error:`, error);
    return Promise.reject(error);
  }
);

// Response interceptor
instance.interceptors.response.use(
  response => {
    // Extract the endpoint name from the URL for logging
    const urlParts = response.config.url.split('/');
    const endpoint = urlParts[urlParts.length - 1];
    
    console.log(`✅ API Response: ${response.status} ${endpoint}`);
    
    // For small responses, log the data (but not for large responses)
    if (response.data && typeof response.data === 'object') {
      const dataSize = JSON.stringify(response.data).length;
      if (dataSize < 1000) {
        console.log('Response data:', response.data);
      } else {
        console.log(`Response data: [${dataSize} bytes]`);
      }
    }
    
    return response;
  },
  error => {
    // Check if response exists
    if (error.response) {
      console.log(`❌ API Error: ${error.message}`);
      console.log(`Status: ${error.response.status}`);
      console.log(`Data: ${typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : error.response.data}`);
      
      // If it's a 404 and we're in development, return mock data
      if (error.response.status === 404 && __DEV__) {
        const url = error.config.url;
        
        // Handle specific endpoints with mock data
        if (url.includes('/locations')) {
          return Promise.resolve({
            data: [],
            status: 200,
            statusText: 'OK (Mocked)',
            config: error.config,
          });
        }
        
        if (url.includes('/posts')) {
          // Generate mock posts with valid structure for testing
          const mockPosts = Array(5).fill().map((_, index) => ({
            _id: `mock-post-${index}`,
            content: `This is a mocked post #${index} for testing purposes.`,
            createdAt: new Date(Date.now() - index * 86400000).toISOString(),
            images: [],
            likesCount: Math.floor(Math.random() * 50),
            commentsCount: Math.floor(Math.random() * 10),
            isLiked: false,
            isSaved: false,
            user: {
              _id: 'mock-user',
              name: 'Test User',
              profileImage: 'https://via.placeholder.com/150'
            }
          }));
          
          return Promise.resolve({
            data: mockPosts,
            status: 200,
            statusText: 'OK (Mocked)',
            config: error.config,
          });
        }
        
        // Handle upcoming-range endpoint with mock data
        if (url.includes('/events/upcoming-range')) {
          console.log('Providing mock data for upcoming-range endpoint');
          let params = error.config.params || {};
          
          // Create mock events that span the requested date range
          const mockEvents = [
            {
              _id: "mock001",
              title: "Sinhala and Tamil New Year Festival",
              description: "Traditional new year celebration with cultural events",
              startDate: params.startDate || new Date().toISOString().split('T')[0],
              endDate: params.startDate || new Date().toISOString().split('T')[0],
              location: {
                name: "Colombo",
                address: "Independence Square",
                city: "Colombo",
                coordinates: {
                  latitude: 6.9101,
                  longitude: 79.8674
                }
              },
              categories: ["Cultural", "Festival"],
              image: "https://cdn.pixabay.com/photo/2016/02/19/10/56/hotel-1209020_960_720.jpg",
              organizer: "Sri Lanka Tourism Board",
              isFeatured: true,
              isFree: true
            },
            {
              _id: "mock002",
              title: "Kandy Esala Perahera",
              description: "Historical procession featuring dancers and elephants",
              startDate: params.endDate || new Date(Date.now() + 30*86400000).toISOString().split('T')[0],
              endDate: params.endDate || new Date(Date.now() + 30*86400000).toISOString().split('T')[0],
              location: {
                name: "Kandy",
                address: "Temple of the Sacred Tooth Relic",
                city: "Kandy",
                coordinates: {
                  latitude: 7.2906,
                  longitude: 80.6337
                }
              },
              categories: ["Cultural", "Religious"],
              image: "https://cdn.pixabay.com/photo/2019/09/03/13/13/kandy-4449042_960_720.jpg",
              organizer: "Temple of the Sacred Tooth Relic",
              isFeatured: true,
              isFree: false
            }
          ];
          
          return Promise.resolve({
            data: mockEvents,
            status: 200,
            statusText: 'OK (Mocked)',
            config: error.config,
          });
        }
      }
    } else {
      // Network error or something prevented the request from completing
      console.log(`❌ API Network Error: ${error.message}`);
      
      // Handle specific requests with mock data for network errors
      if (error.config && error.config.url) {
        const url = error.config.url;
        
        if (url.includes('/events/upcoming-range')) {
          console.log('Network error - providing mock data for upcoming-range endpoint');
          let params = error.config.params || {};
          
          // Create mock events
          const mockEvents = [
            {
              _id: "mock-net-001",
              title: "Vesak Festival",
              description: "Buddhist festival celebrating the birth, enlightenment and death of Buddha",
              startDate: params.startDate || new Date().toISOString().split('T')[0],
              endDate: params.startDate || new Date().toISOString().split('T')[0],
              location: {
                name: "Colombo",
                address: "Gangaramaya Temple",
                city: "Colombo",
                coordinates: {
                  latitude: 6.9167,
                  longitude: 79.8562
                }
              },
              categories: ["Religious", "Cultural"],
              image: "https://cdn.pixabay.com/photo/2015/11/03/10/23/buddhism-1020059_960_720.jpg",
              organizer: "Buddhist Association",
              isFeatured: true,
              isFree: true
            },
            {
              _id: "mock-net-002",
              title: "Colombo International Book Fair",
              description: "Annual book exhibition with local and international publishers",
              startDate: params.endDate || new Date(Date.now() + 60*86400000).toISOString().split('T')[0],
              endDate: params.endDate || new Date(Date.now() + 60*86400000).toISOString().split('T')[0],
              location: {
                name: "BMICH",
                address: "Bauddhaloka Mawatha, Colombo",
                city: "Colombo",
                coordinates: {
                  latitude: 6.9101,
                  longitude: 79.8674
                }
              },
              categories: ["Educational", "Exhibition"],
              image: "https://cdn.pixabay.com/photo/2016/09/10/17/18/book-1659717_960_720.jpg",
              organizer: "Sri Lanka Book Publishers Association",
              isFeatured: false,
              isFree: true
            }
          ];
          
          return Promise.resolve({
            data: mockEvents,
            status: 200,
            statusText: 'OK (Mocked for Network Error)',
            config: error.config,
          });
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default instance;