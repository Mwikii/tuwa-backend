import { Request, Response } from 'express';
import { formatPhoneForSMS, getPhoneVariants, sendOTP, verifyOTP } from '../services/otp.service';
import prisma from '../utils/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const requestOTP = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ error: 'Phone number required' });
      return;
    }
    await sendOTP(phone);
    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

export const verifyAndRegister = async (req: Request, res: Response) => {
  try {
    const { name, phone, email, password, otp, isDriver, licenseNumber, plate, model, color } = req.body;
    const formattedPhone = formatPhoneForSMS(phone);
    const phoneVariants = getPhoneVariants(phone);

    const valid = await verifyOTP(phone, otp);
    if (!valid) {
      res.status(400).json({ error: 'Invalid or expired OTP' });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: { in: phoneVariants } },
          ...(email ? [{ email }] : []),
        ],
      },
    });
    if (existing) {
      res.status(400).json({ error: 'Phone number or email already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: isDriver
        ? {
            name,
            phone: formattedPhone,
            email: email || null,
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
          }
        : {
            name,
            phone: formattedPhone,
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

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email ?? undefined,
        photoUrl: user.photoUrl ?? undefined,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Verify/register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const verifyAndLogin = async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body;
    const phoneVariants = getPhoneVariants(phone);

    const valid = await verifyOTP(phone, otp);
    if (!valid) {
      res.status(400).json({ error: 'Invalid or expired OTP' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { phone: { in: phoneVariants } },
    });
    if (!user) {
      res.status(400).json({ error: 'User not found' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
