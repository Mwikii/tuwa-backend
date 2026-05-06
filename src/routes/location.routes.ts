import { Router } from 'express';
import { protect, driverOnly, riderOnly } from '../middleware/auth.middleware';
import {
  updateDriverLocation,
  getFareEstimate,
  getNearbyDrivers,
} from '../controllers/location.controller';

const router = Router();

router.put('/driver/location', protect, driverOnly, updateDriverLocation);
router.post('/fare-estimate', protect, riderOnly, getFareEstimate);
router.post('/nearby-drivers', protect, riderOnly, getNearbyDrivers);

export default router;
