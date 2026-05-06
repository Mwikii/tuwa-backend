import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../utils/prisma';
import { haversineDistance, calculateFare } from '../utils/distance';
import { io } from '../index';

export const requestTrip = async (req: AuthRequest, res: Response) => {
  try {
    const { pickupLat, pickupLng, pickupAddress, destLat, destLng, destAddress } = req.body;
    const riderId = req.user?.userId;

    const distance = haversineDistance(pickupLat, pickupLng, destLat, destLng);
    const fare = calculateFare(distance);

    const trip = await prisma.trip.create({
      data: {
        riderId: riderId!,
        pickupLat,
        pickupLng,
        pickupAddress,
        destLat,
        destLng,
        destAddress,
        distance: fare.distanceKm,
        fare: fare.exact,
        status: 'REQUESTED',
      },
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
        distance: fare.distanceKm,
        fare: fare.exact,
        fareRange: { low: fare.low, high: fare.high },
      });
    });

    res.status(201).json({
      tripId: trip.id,
      status: trip.status,
      fare: fare.exact,
      fareRange: { low: fare.low, high: fare.high },
      distance: fare.distanceKm,
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
