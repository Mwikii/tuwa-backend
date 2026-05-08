import { Router } from 'express';
import { protect, driverOnly, riderOnly } from '../middleware/auth.middleware';
import {
  updateDriverLocation,
  getFareEstimate,
  getNearbyDrivers,
  saveSearchHistory,
  getSearchHistory,
  getSavedPlaces,
  savePlaces,
} from '../controllers/location.controller';

const router = Router();

router.put('/driver/location', protect, driverOnly, updateDriverLocation);
router.post('/fare-estimate', protect, riderOnly, getFareEstimate);
router.post('/nearby-drivers', protect, riderOnly, getNearbyDrivers);
router.post('/history', protect, riderOnly, saveSearchHistory);
router.get('/history', protect, riderOnly, getSearchHistory);
router.get('/saved-places', protect, getSavedPlaces);
router.post('/saved-places', protect, savePlaces);

export default router;
