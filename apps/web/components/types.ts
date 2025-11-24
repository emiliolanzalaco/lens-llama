export interface Image {
    id: string;
    title: string;
    description: string;
    watermarkedBlobUrl: string;
    originalBlobUrl: string;
    photographerAddress: string;
    photographerUsername?: string | null;
    priceUsdc: string;
    width: number;
    height: number;
}
