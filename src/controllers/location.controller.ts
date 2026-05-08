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
      tiers: fare.tiers,
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

export const saveSearchHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { address, lat, lng } = req.body;
    const userId = req.user?.userId;

    await prisma.searchHistory.upsert({
      where: { userId_address: { userId: userId!, address } },
      update: { count: { increment: 1 }, updatedAt: new Date() },
      create: { userId: userId!, address, lat, lng },
    });

    res.json({ message: 'Saved' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getSearchHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const history = await prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { count: 'desc' },
      take: 5,
    });

    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getSavedPlaces = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const places = await prisma.savedPlace.findMany({ where: { userId } });
    res.json({ places });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const savePlaces = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { type, address, lat, lng } = req.body;

    const place = await prisma.savedPlace.upsert({
      where: { userId_type: { userId: userId!, type } },
      update: { address, lat, lng },
      create: { userId: userId!, type, address, lat, lng },
    });

    res.json({ place });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
