import { Router } from 'express';
import { registerRider, registerDriver, login, updateProfile, resetPassword } from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.post('/register/rider', registerRider);
router.post('/register/driver', registerDriver);
router.post('/login', login);
router.post('/reset-password', resetPassword);
router.put('/profile', protect, updateProfile);

export default router;

