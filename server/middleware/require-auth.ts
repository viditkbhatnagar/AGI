import { Request, Response, NextFunction } from 'express';

// Middleware to check if the user is an admin
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized. Admin access required.' });
  }

  next();
};

// Middleware to check if the user is a student
export const requireStudent = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Not authorized. Student access required.' });
  }

  next();
};

// Middleware to check if the user is either an admin or the specific student
export const requireAdminOrSelf = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const requestedStudentId = req.params.studentId || req.body.studentId;

  if (req.user.role === 'admin' || req.user.id === requestedStudentId) {
    next();
  } else {
    return res.status(403).json({ message: 'Not authorized to access this resource.' });
  }
};

// Middleware to ensure any authenticated user can proceed
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  next();
};
