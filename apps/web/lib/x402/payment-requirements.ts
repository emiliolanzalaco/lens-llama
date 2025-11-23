import { USDC_ADDRESS, NETWORK } from './constants';

interface ImageData {
  id: string;
  title: string;
  priceUsdc: string;
  photographerAddress: string;
}

export interface PaymentRequirements {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
}

export function buildPaymentRequirements(
  image: ImageData,
  baseUrl: string
): PaymentRequirements {
  // Convert priceUsdc string to microUSDC using integer arithmetic to avoid floating-point errors
  const [whole, fraction = ''] = image.priceUsdc.split('.');
  const wholeMicro = BigInt(whole) * BigInt(1_000_000);
  // Pad or trim the fraction to 6 digits (microUSDC precision)
  const fractionMicro = BigInt((fraction + '000000').slice(0, 6));
  const priceInMicroUsdc = (wholeMicro + fractionMicro).toString();

  return {
    scheme: 'exact',
    network: NETWORK,
    maxAmountRequired: priceInMicroUsdc,
    resource: `${baseUrl}/api/images/${image.id}`,
    description: `License for: ${image.title}`,
    mimeType: 'image/jpeg',
    payTo: image.photographerAddress,
    maxTimeoutSeconds: 300,
    asset: USDC_ADDRESS,
  };
}
