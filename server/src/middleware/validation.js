const { validationResult } = require('express-validator');
const errorResponse = require('../utils/errorResponse');

// Middleware to validate request data
module.exports = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Format validation errors
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg
    }));
    
    return res.status(400).json(
      errorResponse('Validation Error', 400, { errors: errorMessages })
    );
  }
  
  next();
};