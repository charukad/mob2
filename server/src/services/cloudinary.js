const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');

/**
 * Upload file to Cloudinary
 * @param {string} filePath - Path to the file
 * @param {string} folder - Cloudinary folder to upload to
 * @param {object} options - Additional options for upload
 * @returns {Promise<object>} Cloudinary upload result
 */
exports.uploadFile = async (filePath, folder = 'sri-lanka-tourism', options = {}) => {
  try {
    // Configure upload options
    const uploadOptions = {
      folder,
      resource_type: 'auto',
      ...options
    };
    
    // Upload file to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, uploadOptions);
    
    // Delete local file after upload
    fs.unlinkSync(filePath);
    
    return result;
  } catch (error) {
    console.error('Error uploading file to Cloudinary:', error);
    throw error;
  }
};

/**
 * Upload multiple files to Cloudinary
 * @param {Array<string>} filePaths - Array of file paths
 * @param {string} folder - Cloudinary folder to upload to
 * @param {object} options - Additional options for upload
 * @returns {Promise<Array<object>>} Array of Cloudinary upload results
 */
exports.uploadMultipleFiles = async (filePaths, folder = 'sri-lanka-tourism', options = {}) => {
  try {
    const uploadPromises = filePaths.map(filePath => this.uploadFile(filePath, folder, options));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading multiple files to Cloudinary:', error);
    throw error;
  }
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Public ID of the file
 * @returns {Promise<object>} Cloudinary deletion result
 */
exports.deleteFile = async (publicId) => {
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    throw error;
  }
};

/**
 * Create a Cloudinary URL with transformations
 * @param {string} publicId - Public ID of the file
 * @param {object} transformations - Cloudinary transformations
 * @returns {string} Transformed URL
 */
exports.getTransformedUrl = (publicId, transformations = {}) => {
  return cloudinary.url(publicId, transformations);
};