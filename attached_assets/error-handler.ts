import { Request, Response, NextFunction } from 'express';

/**
 * Catch-all error handler. Send JSON `{ message }` on errors.
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err);
  const status = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ message });
}