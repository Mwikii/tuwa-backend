import { Router } from 'express';
import { protect, driverOnly } from '../middleware/auth.middleware';
import { initiateDailyFee, mpesaCallback } from '../controllers/payment.controller';

const router = Router();

router.post('/daily-fee', protect, driverOnly, initiateDailyFee);
router.post('/callback', mpesaCallback);

export default router;
