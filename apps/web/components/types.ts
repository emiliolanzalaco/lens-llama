export type ImageSize = 'small' | 'medium' | 'large' | 'tall' | 'wide';

export interface Image {
    id: string;
    title: string;
    description: string;
    watermarkedCid: string;
    encryptedCid: string;
    photographerAddress: string;
    priceUsdc: string;
    size: ImageSize;
}