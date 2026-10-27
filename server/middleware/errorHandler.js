// Centralized error-handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error('Server error:', err.message || err);

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }

  // Mongoose CastError (e.g. invalid ObjectId format)
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid identifier format: ${err.value}` });
  }

  // Custom or thrown status code, defaulting to 500
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected internal server error occurred';

  res.status(statusCode).json({ message });
};

export default errorHandler;
