import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  _: Request,
  res: Response,
  __: NextFunction
): void => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};