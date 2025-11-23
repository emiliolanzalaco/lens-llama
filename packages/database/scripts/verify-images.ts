
import fs from 'fs';
import path from 'path';

// Manually load .env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

async function main() {
    // Dynamically import client after env vars are loaded
    const { db } = await import('../src/client');
    const { images } = await import('../src/schema');
    const { desc } = await import('drizzle-orm');

    console.log('Connecting to database...');
    try {
        console.log('Testing db.query.images.findMany with limit and offset...');
        const limit = 30;
        const offset = 0;

        const allImages = await db.query.images.findMany({
            orderBy: (images, { desc }) => [desc(images.createdAt)],
            limit: limit,
            offset: offset,
            columns: {
                id: true,
                watermarkedCid: true,
                title: true,
                priceUsdc: true,
                photographerAddress: true,
                // Explicitly exclude sensitive fields
                encryptedCid: false,
                encryptionKey: false,
                description: false,
                tags: false,
                width: false,
                height: false,
                createdAt: true,
            },
        });

        console.log(`Query returned: ${allImages.length} images`);
        console.log('Images:', allImages);
    } catch (error) {
        console.error('Error querying database:', error);
    }
    process.exit(0);
}

main();
