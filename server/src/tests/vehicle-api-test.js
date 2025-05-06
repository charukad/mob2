/**
 * Vehicle API Test Script
 * 
 * This script tests the vehicle search API and logs detailed diagnostics
 * to help troubleshoot issues with the mobile app's vehicle feed.
 * 
 * Usage: node vehicle-api-test.js
 */

const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

// API endpoint config
const API_BASE = process.env.API_BASE || 'http://localhost:5008/api';
const ENDPOINTS = {
  SEARCH: `${API_BASE}/vehicles/search`,
  MY_VEHICLES: `${API_BASE}/vehicles/my-vehicles`,
  LIST: `${API_BASE}/vehicles`
};

// Test auth token (if needed)
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';

// Connect to MongoDB to directly check the database
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sri-lanka-tourism';
    console.log(`[TEST] Connecting to MongoDB: ${mongoURI}`);
    await mongoose.connect(mongoURI);
    console.log('[TEST] MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('[TEST] MongoDB connection error:', error.message);
    return false;
  }
};

// Check if Vehicle collection exists and has documents
const checkVehiclesCollection = async () => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const hasVehiclesCollection = collections.some(col => col.name === 'vehicles');
    
    console.log(`[TEST] Vehicles collection exists: ${hasVehiclesCollection}`);
    
    if (hasVehiclesCollection) {
      const count = await mongoose.connection.db.collection('vehicles').countDocuments();
      console.log(`[TEST] Total vehicles in database: ${count}`);
      
      if (count > 0) {
        const sample = await mongoose.connection.db.collection('vehicles')
          .find({})
          .limit(1)
          .toArray();
          
        console.log('[TEST] Sample vehicle fields:', Object.keys(sample[0]));
        console.log('[TEST] Sample vehicle isVerified:', sample[0].isVerified);
        return { exists: true, count, sample: sample[0] };
      }
      
      return { exists: true, count, sample: null };
    }
    
    return { exists: false, count: 0, sample: null };
  } catch (error) {
    console.error('[TEST] Error checking vehicles collection:', error);
    return { exists: false, error: error.message };
  }
};

// Test search endpoint
const testSearchEndpoint = async () => {
  try {
    console.log(`[TEST] Testing search endpoint: ${ENDPOINTS.SEARCH}`);
    
    const response = await axios.get(ENDPOINTS.SEARCH, {
      params: {
        limit: 50
      }
    });
    
    console.log('[TEST] Search response status:', response.status);
    console.log('[TEST] Search response data structure:', Object.keys(response.data));
    
    if (response.data && response.data.data) {
      console.log('[TEST] Vehicles returned:', response.data.data.count);
      console.log('[TEST] Total vehicles:', response.data.data.total);
      
      if (response.data.data.vehicles && response.data.data.vehicles.length > 0) {
        console.log('[TEST] First vehicle fields:', Object.keys(response.data.data.vehicles[0]));
      } else {
        console.log('[TEST] No vehicles returned from search');
      }
    }
    
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    console.error('[TEST] Search endpoint error:', error.message);
    console.error('[TEST] Error details:', error.response?.data || 'No response data');
    
    return {
      success: false,
      status: error.response?.status,
      error: error.message,
      details: error.response?.data
    };
  }
};

// Test authenticated endpoints
const testAuthenticatedEndpoints = async () => {
  if (!AUTH_TOKEN) {
    console.log('[TEST] Skipping authenticated tests: No auth token provided');
    return { skipped: true };
  }
  
  const results = {};
  
  // Test headers
  const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`
  };
  
  // Test my-vehicles endpoint
  try {
    console.log(`[TEST] Testing my-vehicles endpoint: ${ENDPOINTS.MY_VEHICLES}`);
    const response = await axios.get(ENDPOINTS.MY_VEHICLES, { headers });
    
    console.log('[TEST] My-vehicles response status:', response.status);
    console.log('[TEST] My-vehicles count:', response.data.count);
    
    results.myVehicles = {
      success: true,
      status: response.status,
      count: response.data.count
    };
  } catch (error) {
    console.error('[TEST] My-vehicles endpoint error:', error.message);
    
    results.myVehicles = {
      success: false,
      status: error.response?.status,
      error: error.message
    };
  }
  
  // Test list endpoint
  try {
    console.log(`[TEST] Testing list endpoint: ${ENDPOINTS.LIST}`);
    const response = await axios.get(ENDPOINTS.LIST, { headers });
    
    console.log('[TEST] List response status:', response.status);
    console.log('[TEST] List data structure:', Object.keys(response.data));
    
    results.list = {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    console.error('[TEST] List endpoint error:', error.message);
    
    results.list = {
      success: false,
      status: error.response?.status,
      error: error.message
    };
  }
  
  return results;
};

// Run all tests
const runTests = async () => {
  console.log('\n=== VEHICLE API TEST DIAGNOSTICS ===\n');
  
  // Test database
  const dbConnected = await connectDB();
  if (!dbConnected) {
    console.error('[TEST] Cannot proceed with tests due to database connection failure');
    return;
  }
  
  // Check vehicles collection
  const collectionCheck = await checkVehiclesCollection();
  
  // API tests
  const searchResults = await testSearchEndpoint();
  const authResults = await testAuthenticatedEndpoints();
  
  // Print summary
  console.log('\n=== TEST SUMMARY ===\n');
  console.log('Database connection:', dbConnected ? 'SUCCESS' : 'FAILED');
  console.log('Vehicles collection:', collectionCheck.exists ? 'EXISTS' : 'MISSING');
  console.log('Vehicles count:', collectionCheck.count);
  console.log('Search endpoint:', searchResults.success ? 'SUCCESS' : 'FAILED');
  
  if (authResults.skipped) {
    console.log('Authenticated endpoints: SKIPPED (no token)');
  } else {
    console.log('My-vehicles endpoint:', authResults.myVehicles.success ? 'SUCCESS' : 'FAILED');
    console.log('List endpoint:', authResults.list.success ? 'SUCCESS' : 'FAILED');
  }
  
  console.log('\n=== API AVAILABILITY REPORT ===\n');
  
  // Analyze results and provide advice
  if (!collectionCheck.exists || collectionCheck.count === 0) {
    console.log('ISSUE: No vehicles in database. Create test vehicle data first.');
  }
  
  if (searchResults.success && searchResults.data.data.count === 0) {
    console.log('ISSUE: Search endpoint works but returns no vehicles. Check isVerified filter.');
  }
  
  if (!searchResults.success) {
    console.log('ISSUE: Search endpoint failed. Mobile app should use error handling.');
  }
  
  if (!authResults.skipped) {
    if (!authResults.myVehicles.success && !authResults.list.success) {
      console.log('ISSUE: All authenticated endpoints failed. Check token validity.');
    } else if (!authResults.myVehicles.success) {
      console.log('ISSUE: My-vehicles endpoint failed but list worked. Check user role permissions.');
    } else if (!authResults.list.success) {
      console.log('ISSUE: List endpoint failed but my-vehicles worked. Check route configuration.');
    }
  }
  
  console.log('\nDiagnostics complete. Check logs above for detailed information.');
  
  // Disconnect from MongoDB
  await mongoose.disconnect();
};

// Execute tests
runTests()
  .then(() => {
    console.log('Test script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test script error:', error);
    process.exit(1);
  }); 