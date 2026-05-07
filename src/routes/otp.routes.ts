import { Router } from 'express';
import { requestOTP, verifyAndRegister, verifyAndLogin } from '../controllers/otp.controller';

const router = Router();

router.post('/send', requestOTP);
router.post('/verify-register', verifyAndRegister);
router.post('/verify-login', verifyAndLogin);

export default router;
