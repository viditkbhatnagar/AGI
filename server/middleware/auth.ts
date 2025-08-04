import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// JWT secret key - should be stored in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Extend express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
        role: string;
        accessEnabled: boolean;
      };
    }
  }
}

export const generateToken = (user: { id: string; username: string; email: string; role: string; accessEnabled: boolean }) => {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role, accessEnabled: user.accessEnabled },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const auth = (req: Request, res: Response, next: NextFunction) => {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  // Check if token exists
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      username: string;
      email: string;
      role: string;
      accessEnabled: boolean;
    };

    // Check if student access is enabled (only block if explicitly set to false)
    if (decoded.role === 'student' && decoded.accessEnabled === false) {
      return res.status(403).json({ 
        message: 'Your access has been temporarily suspended due to pending course fee payment. Please contact support.',
        suspended: true
      });
    }

    // Set user to req object
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
