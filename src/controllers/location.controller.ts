import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../utils/prisma';
import { haversineDistance, calculateFare } from '../utils/distance';

export const updateDriverLocation = async (req: AuthRequest, res: Response) => {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.user?.userId;

    const driver = await prisma.driver.findUnique({ where: { userId } });
    if (!driver) {
      res.status(404).json({ error: 'Driver not found' });
      return;
    }

    if (!driver.isActive) {
      res.status(403).json({ error: 'Driver has not paid daily fee' });
      return;
    }

    const updated = await prisma.driver.update({
      where: { userId },
      data: { latitude, longitude },
    });

    res.json({
      message: 'Location updated',
      latitude: updated.latitude,
      longitude: updated.longitude,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getFareEstimate = async (req: AuthRequest, res: Response) => {
  try {
    const { pickupLat, pickupLng, destLat, destLng } = req.body;

    if (!pickupLat || !pickupLng || !destLat || !destLng) {
      res.status(400).json({ error: 'All coordinates are required' });
      return;
    }

    const distance = haversineDistance(pickupLat, pickupLng, destLat, destLng);
    const fare = calculateFare(distance);

    res.json({
      distanceKm: fare.distanceKm,
      estimatedFare: {
        low: fare.low,
        high: fare.high,
        exact: fare.exact,
        currency: 'KES',
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getNearbyDrivers = async (req: AuthRequest, res: Response) => {
  try {
    const { latitude, longitude } = req.body;
    const RADIUS_KM = 5;

    const drivers = await prisma.driver.findMany({
      where: {
        isAvailable: true,
        isActive: true,
        latitude: { not: null },
        longitude: { not: null },
      },
      include: {
        user: { select: { name: true, phone: true } },
        vehicle: true,
      },
    });

    const nearby = drivers.filter((driver) => {
      const distance = haversineDistance(
        latitude,
        longitude,
        driver.latitude!,
        driver.longitude!
      );
      return distance <= RADIUS_KM;
    });

    res.json({ drivers: nearby, count: nearby.length });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
