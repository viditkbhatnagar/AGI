import { Request, Response, NextFunction } from 'express';

// Middleware to check if the user is an admin or superadmin (both can access admin routes)
export const requireAdminAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Not authorized. Admin access required.' });
  }

  next();
};

// Middleware to check if the user is an admin (for write operations)
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized. Admin access required.' });
  }

  next();
};

// Middleware to check if the user is a teacher
export const requireTeacher = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (req.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Not authorized. Teacher access required.' });
  }

  next();
};

// Middleware to check if the user has teaching access (admin, superadmin, or teacher)
export const requireTeachingAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Not authorized. Teaching access required.' });
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

  if (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.id === requestedStudentId) {
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
