import { db } from './client';
import { images } from './schema';
import { count } from 'drizzle-orm';

async function verifySeed() {
    try {
        const result = await db.select({ count: count() }).from(images);
        console.log('Image count in DB:', result[0].count);

        const allImages = await db.query.images.findMany({
            limit: 5,
        });
        console.log('Sample images:', JSON.stringify(allImages, null, 2));
    } catch (error) {
        console.error('Error verifying seed:', error);
    }
    process.exit(0);
}

verifySeed();
