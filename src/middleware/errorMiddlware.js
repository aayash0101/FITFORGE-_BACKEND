// Handles requests to routes that don't exist
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found — ${req.originalUrl}`);
  res.status(404);
  next(error);  // Pass to errorHandler below
};

// Global error handler — catches ALL errors
export const errorHandler = (err, req, res, next) => {
  // Sometimes an error is thrown but status is still 200 — fix that
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Mongoose: bad ObjectId (e.g. /products/not-a-valid-id)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    message = 'Resource not found';
    statusCode = 404;
  }

  // Mongoose: duplicate key (e.g. email already registered)
  if (err.code === 11000) {
    message = `${Object.keys(err.keyValue)} already exists`;
    statusCode = 400;
  }

  // Mongoose: validation error
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(e => e.message).join(', ');
    statusCode = 400;
  }

  res.status(statusCode).json({
    success: false,
    message,
    // Only show stack trace in development
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};