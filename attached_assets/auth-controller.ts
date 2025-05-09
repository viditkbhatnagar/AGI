import { Request, Response, NextFunction } from 'express';
import { User } from '../models/user';
import bcrypt from 'bcrypt';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, email, password, role } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(409).json({ message: 'Username or email already in use' });
    }
    const user = await User.create({ username, email, password: hashed, role });
    // don't send password back
    const { password: _, ...safe } = user.toObject();
    res.status(201).json(safe);
  } catch (err) {
    next(err);
  }
};

export async function login(req: Request, res: Response, next: NextFunction) {
    try {
      // --- 1. Validate payload ------------------------------------------------
      const { email, password } = req.body as { email?: string; password?: string };
  
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
      }
  
      // --- 2. Get user --------------------------------------------------------
      const user = await User.findOne({ email }).exec();
      console.log('Login attempt for:', email);
      console.log('  Found user:', !!user);
  
      if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  
      // --- 3. Check password --------------------------------------------------
      const match = await bcrypt.compare(password, user.password);
      console.log('  Password match:', match);
  
      if (!match) return res.status(401).json({ message: 'Invalid credentials' });
  
      // --- 4. Set session -----------------------------------------------------
      req.session.userId = user.id.toString();
      req.session.userRole = user.role;        // “admin” or “student”
  
      res.json({ success: true, user: { id: user._id, role: user.role } });
    } catch (err) {
      next(err);
    }
  }

export const logout = (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
};

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const user = await User.findById(req.session.userId).lean();
    if (!user) return res.status(404).end();
    const { password, ...safe } = user as any;
    res.json(safe);
  } catch (err) {
    next(err);
  }
};