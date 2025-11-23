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
  const priceInMicroUsdc = Math.round(parseFloat(image.priceUsdc) * 1_000_000);

  return {
    scheme: 'exact',
    network: NETWORK,
    maxAmountRequired: priceInMicroUsdc.toString(),
    resource: `${baseUrl}/api/images/${image.id}`,
    description: `License for: ${image.title}`,
    mimeType: 'image/jpeg',
    payTo: image.photographerAddress,
    maxTimeoutSeconds: 300,
    asset: USDC_ADDRESS,
  };
}
