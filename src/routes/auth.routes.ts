import { Router } from 'express';
import { registerRider, registerDriver, login } from '../controllers/auth.controller';

const router = Router();

router.post('/register/rider', registerRider);
router.post('/register/driver', registerDriver);
router.post('/login', login);

export default router;
