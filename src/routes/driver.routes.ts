import { Router } from 'express';
import { protect, driverOnly } from '../middleware/auth.middleware';
import { getDriverStatus, updateDriverAvailability } from '../controllers/location.controller';
import { getDriverEarnings } from '../controllers/trip.controller';

const router = Router();

router.get('/status', protect, driverOnly, getDriverStatus);
router.put('/availability', protect, driverOnly, updateDriverAvailability);
router.get('/earnings', protect, driverOnly, getDriverEarnings);

export default router;