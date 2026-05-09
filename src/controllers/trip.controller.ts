import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../utils/prisma';
import { haversineDistance, calculateFare } from '../utils/distance';
import { io } from '../index';

export const requestTrip = async (req: AuthRequest, res: Response) => {
  try {
    const { pickupLat, pickupLng, pickupAddress, destLat, destLng, destAddress, vehicleType, fare } = req.body;
    const riderId = req.user?.userId;

    const distanceResult = calculateFare(haversineDistance(pickupLat, pickupLng, destLat, destLng));
    const distanceKm = distanceResult.distanceKm;

    const trip = await prisma.trip.create({
      data: {
        riderId: riderId!,
        pickupLat,
        pickupLng,
        pickupAddress,
        destLat,
        destLng,
        destAddress,
        distance: distanceKm,
        fare: fare,
        status: 'REQUESTED',
      },
    });

    await prisma.searchHistory.upsert({
      where: { userId_address: { userId: riderId!, address: destAddress } },
      update: { count: { increment: 1 }, updatedAt: new Date() },
      create: { userId: riderId!, address: destAddress, lat: destLat, lng: destLng },
    });

    const RADIUS_KM = 5;
    const drivers = await prisma.driver.findMany({
      where: {
        isAvailable: true,
        isActive: true,
        latitude: { not: null },
        longitude: { not: null },
      },
      include: { user: true },
    });

    const nearbyDrivers = drivers.filter((driver) => {
      const dist = haversineDistance(
        pickupLat,
        pickupLng,
        driver.latitude!,
        driver.longitude!
      );
      return dist <= RADIUS_KM;
    });

    nearbyDrivers.forEach((driver) => {
      io.to(driver.userId).emit('trip:request', {
        tripId: trip.id,
        pickupAddress,
        destAddress,
        distance: distanceKm,
        fare,
        vehicleType,
      });
    });

    res.status(201).json({
      tripId: trip.id,
      status: trip.status,
      fare,
      vehicleType,
      distance: distanceKm,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const acceptTrip = async (req: AuthRequest, res: Response) => {
  try {
    const rawTripId = req.params.tripId;
    const tripId = (Array.isArray(rawTripId) ? rawTripId[0] : rawTripId) as string;
    if (!tripId) {
      res.status(400).json({ error: 'Invalid trip id' });
      return;
    }
    const userId = req.user?.userId;

    const driver = await prisma.driver.findUnique({ where: { userId } });
    if (!driver) {
      res.status(404).json({ error: 'Driver not found' });
      return;
    }

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip || trip.status !== 'REQUESTED') {
      res.status(400).json({ error: 'Trip not available' });
      return;
    }

    await prisma.trip.update({
      where: { id: tripId },
      data: { driverId: driver.id, status: 'ACCEPTED' },
    });

    await prisma.driver.update({
      where: { id: driver.id },
      data: { isAvailable: false },
    });

    const updatedTrip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        driver: {
          include: {
            user: true,
            vehicle: true,
          },
        },
      },
    });

    const driverRel: any = (updatedTrip as any)?.driver;

    io.to(trip.riderId).emit('trip:accepted', {
      tripId,
      driver: {
        name: driverRel?.user?.name,
        phone: driverRel?.user?.phone,
        vehicle: driverRel?.vehicle,
        latitude: driver.latitude,
        longitude: driver.longitude,
      },
    });

    res.json({ message: 'Trip accepted', tripId, status: 'ACCEPTED' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateTripStatus = async (req: AuthRequest, res: Response) => {
  try {
    const rawTripId = req.params.tripId;
    const tripId = (Array.isArray(rawTripId) ? rawTripId[0] : rawTripId) as string;
    if (!tripId) {
      res.status(400).json({ error: 'Invalid trip id' });
      return;
    }
    const { status } = req.body;
    const userId = req.user?.userId;

    const validStatuses = ['DRIVER_ARRIVING', 'IN_PROGRESS', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const driver = await prisma.driver.findUnique({ where: { userId } });
    if (!driver) {
      res.status(404).json({ error: 'Driver not found' });
      return;
    }

    const trip = await prisma.trip.update({
      where: { id: tripId },
      data: { status },
    });

    if (status === 'COMPLETED') {
      await prisma.driver.update({
        where: { id: driver.id },
        data: { isAvailable: true },
      });
    }

    io.to(trip.riderId).emit('trip:status', { tripId, status });

    res.json({ tripId, status });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getTripDetails = async (req: AuthRequest, res: Response) => {
  try {
    const rawTripId = req.params.tripId;
    const tripId = (Array.isArray(rawTripId) ? rawTripId[0] : rawTripId) as string;
    if (!tripId) {
      res.status(400).json({ error: 'Invalid trip id' });
      return;
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        driver: {
          include: {
            user: { select: { name: true, phone: true } },
            vehicle: true,
          },
        },
        rider: { select: { name: true, phone: true } },
      },
    });

    if (!trip) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }

    res.json(trip);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getTripHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const trips = await prisma.trip.findMany({
      where: { riderId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        driver: {
          include: {
            user: { select: { name: true } },
            vehicle: true,
          },
        },
      },
    });

    res.json({ trips });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
export const getDriverEarnings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const driver = await prisma.driver.findUnique({ where: { userId } });
    if (!driver) {
      res.status(404).json({ error: 'Driver not found' });
      return;
    }

    const trips = await prisma.trip.findMany({
      where: { driverId: driver.id, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        rider: { select: { name: true } },
      },
    });

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const today = trips
      .filter((t) => new Date(t.createdAt) >= startOfDay)
      .reduce((sum, t) => sum + t.fare, 0);

    const week = trips
      .filter((t) => new Date(t.createdAt) >= startOfWeek)
      .reduce((sum, t) => sum + t.fare, 0);

    const total = trips.reduce((sum, t) => sum + t.fare, 0);

    res.json({
      trips,
      stats: {
        today: Math.round(today),
        week: Math.round(week),
        total: Math.round(total),
        trips: trips.length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
