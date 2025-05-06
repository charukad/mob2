/**
 * Response Wrapper Utility
 *
 * Standardizes API responses and provides consistent error handling
 */

const errorResponse = require('./errorResponse');

/**
 * Wraps a controller function with standard error handling
 * @param {Function} controllerFn The controller function to wrap
 * @param {String} controllerName Name of the controller for logging
 * @returns {Function} Express middleware function
 */
exports.withErrorHandling = (controllerFn, controllerName = 'Unknown') => {
  return async (req, res, next) => {
    try {
      console.log(`[${controllerName}] Request received from ${req.ip}`);
      await controllerFn(req, res, next);
    } catch (error) {
      console.error(`[${controllerName}] Unhandled error:`, error);
      
      // Determine error type and send appropriate response
      if (error.name === 'ValidationError') {
        return res.status(400).json(errorResponse(
          `Validation error: ${error.message}`, 400
        ));
      }
      
      if (error.name === 'CastError') {
        return res.status(400).json(errorResponse(
          `Invalid ID format: ${error.message}`, 400
        ));
      }
      
      if (error.code === 11000) {
        return res.status(409).json(errorResponse(
          'Duplicate resource', 409
        ));
      }
      
      // Default to 500 server error
      return res.status(500).json(errorResponse(
        `Server error: ${error.message}`, 500
      ));
    }
  };
};

/**
 * Creates a standardized success response
 * @param {Object} data The data to include in the response
 * @param {Number} statusCode HTTP status code (default: 200)
 * @returns {Object} Standard success response object
 */
exports.successResponse = (data, statusCode = 200) => {
  return {
    status: 'success',
    statusCode,
    data
  };
};

/**
 * Creates a safe vehicle search response with fallbacks
 * @param {Array} vehicles Array of vehicle objects
 * @param {Number} total Total count of matching vehicles
 * @param {Object} pagination Pagination details
 * @returns {Object} Standardized vehicle search response
 */
exports.vehicleSearchResponse = (vehicles = [], total = 0, pagination = {}) => {
  // Ensure pagination has all required fields
  const safeVehicles = vehicles || [];
  const safeTotal = total || 0;
  const safePagination = {
    currentPage: pagination.currentPage || 1,
    totalPages: pagination.totalPages || Math.ceil(safeTotal / 10),
    hasNext: pagination.hasNext || false,
    hasPrev: pagination.hasPrev || false
  };
  
  return {
    status: 'success',
    data: {
      count: safeVehicles.length,
      total: safeTotal,
      pagination: safePagination,
      vehicles: safeVehicles
    }
  };
}; 