import { Router } from 'express';
import { protect, riderOnly, driverOnly } from '../middleware/auth.middleware';
import { requestTrip, acceptTrip, updateTripStatus, getTripDetails, getTripHistory } from '../controllers/trip.controller';

const router = Router();

router.post('/request', protect, riderOnly, requestTrip);
router.get('/history', protect, riderOnly, getTripHistory);
router.put('/:tripId/accept', protect, driverOnly, acceptTrip);
router.put('/:tripId/status', protect, driverOnly, updateTripStatus);
router.get('/:tripId', protect, getTripDetails);

export default router;
