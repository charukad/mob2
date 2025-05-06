const mongoose = require('mongoose');
const uri = 'mongodb://localhost:27017/tourism-guide';

// Define the ProfileImage schema directly
const ProfileImageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    email: {
      type: String,
      required: true,
      index: true
    },
    cloudinaryId: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  {
    timestamps: true,
  }
);

// Create the model
const ProfileImage = mongoose.model('ProfileImage', ProfileImageSchema);

async function findProfileImage(email) {
  try {
    console.log(`Searching for profile image with email: ${email}`);
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    
    const image = await ProfileImage.findOne({ email });
    
    if (!image) {
      console.log(`No profile image found for email: ${email}`);
      return;
    }
    
    console.log('===== PROFILE IMAGE FOUND =====');
    console.log('Email:', image.email);
    console.log('CloudinaryId:', image.cloudinaryId);
    console.log('ImageUrl:', image.imageUrl);
    console.log('IsActive:', image.isActive);
    console.log('Created:', image.createdAt);
    console.log('===== END PROFILE IMAGE =====');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Call the function with the email
findProfileImage('isuru@gmail.com'); 