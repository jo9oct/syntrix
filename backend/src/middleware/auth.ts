import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-development-key-change-in-production') as any;
    req.user = await User.findById(decoded.id);
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'User no longer exists' });
    }
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: `User role ${req.user?.role} is not authorized to access this route` });
    }
    next();
  };
};

// Add user to express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}
