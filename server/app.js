// Main Express app.js file
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import models
const User = require('./src/models/User');

// Set environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Create app and server
const app = express();
const server = http.createServer(app);

// Add middleware
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple auth middleware for development
const authMiddleware = async (req, res, next) => {
  console.log('Using test auth middleware');
  
  // Get token from header
  let token = null;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }
  
  try {
    // Verify token with proper JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by id and exclude password
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive'
      });
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed'
    });
  }
};

// Socket.io initialization with NO authentication for development
const socketIO = require('socket.io');
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/socket.io'
});

// Simplified socket handler for development
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Attach a mock user for all socket operations
  socket.user = { 
    _id: '12345', 
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User'
  };
  
  // Handle joining chat rooms
  socket.on('joinConversation', (conversationId) => {
    socket.join(`conversation:${conversationId}`);
    console.log(`User joined conversation: ${conversationId}`);
  });
  
  // Handle sending messages
  socket.on('sendMessage', (data) => {
    const { conversationId, content } = data;
    console.log(`Message sent to conversation ${conversationId}: ${content}`);
    
    // Create mock message
    const message = {
      _id: `msg_${Date.now()}`,
      content,
      senderId: socket.user._id,
      createdAt: new Date(),
      conversationId
    };
    
    // Broadcast to the conversation room
    io.to(`conversation:${conversationId}`).emit('newMessage', message);
    
    // Confirm to sender
    socket.emit('messageSent', { success: true, messageId: message._id });
  });
  
  // Handle disconnections
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Make io available to routes
app.set('io', io);

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Get a test token without providing credentials (DEV ONLY)
app.get('/api/test-token', (req, res) => {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { id: '12345', email: 'test@example.com' }, 
    'srilanka_tourism_secret_key_for_development_only',
    { expiresIn: '30d' }
  );
  
  res.status(200).json({
    success: true,
    token
  });
});

// Authentication endpoint for login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`Login attempt: ${email}, password: ${password}`);
    
    // Simple validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }
    
    // Find user by email - need to include password since it's select: false by default
    const user = await User.findOne({ email }).select('+password');
    
    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Check if password matches - using matchPassword instead of comparePassword
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Update last login timestamp
    user.lastLogin = new Date();
    
    // Generate tokens
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
    );
    
    // Store refresh token with user
    user.refreshToken = refreshToken;
    await user.save();
    
    // Return success with user data and tokens
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      refreshToken,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// User info endpoint
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Tourist profile endpoint
app.get('/api/tourists/profile', (req, res) => {
  // Return mock tourist profile data
  res.status(200).json({
    success: true,
    data: {
      tourist: {
        _id: '12345',
        user: {
          _id: '12345',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          profileImage: null
        },
        preferences: {
          interests: ['historical', 'nature', 'adventure'],
          tripTypes: ['leisure', 'adventure'],
          accommodationTypes: ['hotel', 'hostel', 'villa'],
          budget: 'medium'
        },
        visitHistory: [
          {
            locationId: 'loc1',
            name: 'Sigiriya',
            visitDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 days ago
            rating: 5
          }
        ],
        favoriteLocations: ['loc2', 'loc3'],
        pendingReviews: [],
        completedReviews: [],
        nationalityCountry: 'United States',
        languagesSpoken: ['English'],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180), // 180 days ago
        updatedAt: new Date()
      }
    }
  });
});

// Test login route that doesn't require authentication
app.post('/api/test-login', (req, res) => {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { id: '12345', email: 'test@example.com' }, 
    'srilanka_tourism_secret_key_for_development_only',
    { expiresIn: '30d' }
  );
  
  res.status(200).json({
    success: true,
    message: 'Test login successful',
    token,
    user: {
      _id: '12345',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'tourist'
    }
  });
});

// Add message routes
const messageRoutes = require('./routes/messageRoutes');
app.use('/api', messageRoutes); 

// Add location routes
const locationRoutes = require('./locationRoutes');
app.use('/api', locationRoutes);

// Add location types endpoint
app.get('/api/locations/types', (req, res) => {
  // Return predefined location types
  res.status(200).json({
    success: true,
    types: [
      'historical',
      'nature',
      'religious',
      'beach',
      'cultural',
      'adventure'
    ]
  });
});

// Registration endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, phoneNumber, role } = req.body;
    
    console.log(`Register attempt: ${email}, role: ${role}`);
    
    // Simple validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Create new user with appropriate fields matching the schema
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      phoneNumber: phoneNumber || '',
      role: role || 'tourist',
      isVerified: false,
      isActive: true,
      preferredLanguage: 'en',
      notificationSettings: {
        email: true,
        push: true,
        sms: false
      },
      lastLogin: new Date()
    });
    
    // Save user to database
    await user.save();
    
    // Generate tokens
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
    );
    
    // Store refresh token with user for token validation
    user.refreshToken = refreshToken;
    await user.save();
    
    // Return success with user data and token
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      refreshToken,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phoneNumber: user.phoneNumber,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// Start server
const PORT = process.env.PORT || 5008;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server }; 