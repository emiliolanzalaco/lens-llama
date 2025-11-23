export type ImageSize = 'small' | 'medium' | 'large' | 'tall' | 'wide';

export interface Image {
    id: string;
    title: string;
    description: string;
    watermarkedCid: string;
    encryptedCid: string;
    photographerAddress: string;
    photographerUsername?: string | null;
    priceUsdc: string;
    size: ImageSize;
}

export interface ImageWithSize extends Image {
    size: ImageSize;
}
