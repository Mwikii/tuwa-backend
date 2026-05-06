import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../utils/prisma';
import { stkPush } from '../services/mpesa.service';

const DAILY_FEE = 300;

export const initiateDailyFee = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const driver = await prisma.driver.findUnique({ where: { userId } });
    if (!driver) {
      res.status(404).json({ error: 'Driver not found' });
      return;
    }

    const result = await stkPush(user.phone, DAILY_FEE, `TUWA-${driver.id.slice(0, 8)}`);

    res.json({
      message: 'STK push sent. Enter your M-Pesa PIN to activate for the day.',
      checkoutRequestId: result.CheckoutRequestID,
    });
  } catch (error: any) {
    console.error('STK Push error:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
};

export const mpesaCallback = async (req: any, res: Response) => {
  try {
    const body = req.body;
    const stkCallback = body?.Body?.stkCallback;

    if (!stkCallback) {
      res.status(400).json({ error: 'Invalid callback' });
      return;
    }

    const resultCode = stkCallback.ResultCode;
    const checkoutRequestId = stkCallback.CheckoutRequestID;

    if (resultCode === 0) {
      const metadata = stkCallback.CallbackMetadata.Item;
      const mpesaCode = metadata.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;
      const phone = String(metadata.find((i: any) => i.Name === 'PhoneNumber')?.Value);

      const formattedPhone = phone.startsWith('254')
        ? `0${phone.slice(3)}`
        : phone;

      const user = await prisma.user.findUnique({ where: { phone: formattedPhone } });
      if (user) {
        await prisma.driver.update({
          where: { userId: user.id },
          data: { isActive: true },
        });

        console.log(`Driver ${user.name} activated. M-Pesa code: ${mpesaCode}`);
      }
    } else {
      console.log(`Payment failed or cancelled. Code: ${resultCode}`);
    }

    res.json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ error: 'Callback processing failed' });
  }
};
