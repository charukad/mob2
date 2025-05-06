const mongoose = require('mongoose');
const path = require('path');

// Load environment variables with an absolute path to the .env file
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('MongoDB URI:', process.env.MONGODB_URI);
console.log('Environment variables loaded:', Object.keys(process.env).filter(key => 
  ['MONGODB_URI', 'PORT', 'NODE_ENV', 'JWT_SECRET'].includes(key)
));

// Connect to MongoDB with a direct URI if needed
const connectDB = async () => {
  try {
    // Try with environment variable first
    let uri = process.env.MONGODB_URI;
    
    // If that's not working, use a direct URI as a fallback
    if (!uri) {
      console.log('MONGODB_URI not found in environment variables, using fallback URI');
      uri = 'mongodb://localhost:27017/sri-lanka-tourism';
    }
    
    console.log('Attempting to connect to MongoDB with URI:', uri);
    
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Call the connect function
connectDB();