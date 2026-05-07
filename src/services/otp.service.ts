const AfricasTalking = require('africastalking');
import prisma from '../utils/prisma';

const at = AfricasTalking({
  apiKey: process.env.AT_API_KEY!,
  username: process.env.AT_USERNAME!,
});

const sms = at.SMS;

const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const formatPhoneForSMS = (phone: string): string => {
  const cleaned = phone.replace(/\s+/g, '');

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  if (cleaned.startsWith('0')) {
    return `+254${cleaned.slice(1)}`;
  }

  if (cleaned.startsWith('254')) {
    return `+${cleaned}`;
  }

  return `+${cleaned}`;
};

export const getPhoneVariants = (phone: string): string[] => {
  const formatted = formatPhoneForSMS(phone);
  const variants = new Set([phone.replace(/\s+/g, ''), formatted]);

  if (formatted.startsWith('+254')) {
    variants.add(`0${formatted.slice(4)}`);
    variants.add(formatted.slice(1));
  }

  return Array.from(variants);
};

export const sendOTP = async (phone: string): Promise<void> => {
  const otp = generateOTP();
  const expiry = new Date(Date.now() + 10 * 60 * 1000);
  const formattedPhone = formatPhoneForSMS(phone);

  await prisma.oTP.upsert({
    where: { phone: formattedPhone },
    update: { code: otp, expiresAt: expiry, used: false },
    create: { phone: formattedPhone, code: otp, expiresAt: expiry },
  });

  const response = await sms.send({
    to: [formattedPhone],
    message: `Your Tuwa verification code is ${otp}. Valid for 10 minutes.`,
  });

  console.log('OTP SMS response:', JSON.stringify(response));
};

export const verifyOTP = async (phone: string, code: string): Promise<boolean> => {
  const formattedPhone = formatPhoneForSMS(phone);
  const record = await prisma.oTP.findUnique({ where: { phone: formattedPhone } });

  if (!record) return false;
  if (record.used) return false;
  if (record.code !== code) return false;
  if (record.expiresAt < new Date()) return false;

  await prisma.oTP.update({
    where: { phone: formattedPhone },
    data: { used: true },
  });

  return true;
};
