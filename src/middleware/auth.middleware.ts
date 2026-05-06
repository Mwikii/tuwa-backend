import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
      role: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const riderOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'RIDER') {
    res.status(403).json({ error: 'Riders only' });
    return;
  }
  next();
};

export const driverOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'DRIVER') {
    res.status(403).json({ error: 'Drivers only' });
    return;
  }
  next();
};
