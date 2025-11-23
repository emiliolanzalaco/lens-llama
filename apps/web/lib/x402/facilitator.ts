import { buildPaymentRequirements, type PaymentRequirements } from './payment-requirements';

interface ImageData {
  id: string;
  title: string;
  priceUsdc: string;
  photographerAddress: string;
}

export interface VerifyResult {
  isValid: boolean;
  invalidReason?: string;
}

export interface SettleResult {
  success: boolean;
  transaction?: string;
  errorReason?: string;
}

export async function verifyPayment(
  paymentPayload: any,
  image: ImageData,
  baseUrl: string
): Promise<VerifyResult> {
  const facilitatorUrl = process.env.FACILITATOR_URL;

  if (!facilitatorUrl) {
    console.warn('No FACILITATOR_URL configured - skipping verification');
    return { isValid: true };
  }

  const paymentRequirements = buildPaymentRequirements(image, baseUrl);

  const response = await fetch(`${facilitatorUrl}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentPayload, paymentRequirements }),
  });

  return await response.json();
}

export async function settlePayment(
  paymentPayload: any,
  image: ImageData,
  baseUrl: string
): Promise<SettleResult> {
  const facilitatorUrl = process.env.FACILITATOR_URL;

  if (!facilitatorUrl) {
    console.warn('No FACILITATOR_URL configured - skipping settlement');
    return {
      success: true,
      transaction: '0x' + '0'.repeat(64),
    };
  }

  const paymentRequirements = buildPaymentRequirements(image, baseUrl);

  const response = await fetch(`${facilitatorUrl}/settle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentPayload, paymentRequirements }),
  });

  return await response.json();
}
