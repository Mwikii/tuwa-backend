import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

export const registerRider = async (req: Request, res: Response) => {
  try {
    const { name, phone, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      res.status(400).json({ error: 'Phone number already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        email: email || null,
        password: hashedPassword,
        role: 'RIDER',
      },
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '30d' }
    );

    res.status(201).json({ token, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const registerDriver = async (req: Request, res: Response) => {
  try {
    const { name, phone, password, licenseNumber, plate, model, color } = req.body;

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      res.status(400).json({ error: 'Phone number already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        password: hashedPassword,
        role: 'DRIVER',
        driver: {
          create: {
            licenseNumber,
            vehicle: {
              create: { plate, model, color },
            },
          },
        },
      },
      include: { driver: { include: { vehicle: true } } },
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '30d' }
    );

    res.status(201).json({ token, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      res.status(400).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(400).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '30d' }
    );

    res.json({ token, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};



