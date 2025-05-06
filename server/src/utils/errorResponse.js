/**
 * Create standardized error response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {object} extras - Additional data to include in the response
 * @returns {object} Error response object
 */
const errorResponse = (message, statusCode, extras = {}) => {
    return {
      success: false,
      status: 'error',
      message,
      statusCode,
      ...extras,
    };
  };
  
  module.exports = errorResponse;