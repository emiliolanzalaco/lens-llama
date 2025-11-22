import crypto from 'crypto';
import { db } from './client';
import { images } from './schema';
import { encryptWithMasterKey } from './utils/encryption';

/**
 * Seeds the database with real images from IPFS
 * Using public domain images from various IPFS gateways
 */
export async function seedDatabase(count: number = 30) {
  const masterKey = process.env.MASTER_ENCRYPTION_KEY;
  if (!masterKey) {
    throw new Error('MASTER_ENCRYPTION_KEY environment variable is required');
  }

  // Real IPFS images - public domain landscape and nature photos
  const realImages = [
    {
      title: 'Sunset over Mountains',
      watermarkedCid: 'QmPbxeGcXhYQQNgsC6a36dDyYUcHgMLnGKnF8pVFmGsvqi',
      description: 'Breathtaking mountain sunset with golden hues',
      tags: ['nature', 'landscape', 'sunset', 'mountains'],
      width: 3840,
      height: 2160,
    },
    {
      title: 'Ocean Waves',
      watermarkedCid: 'QmPbxeGcXhYQQNgsC6a36dDyYUcHgMLnGKnF8pVFmGsvqi',
      description: 'Powerful ocean waves crashing on rocky shore',
      tags: ['ocean', 'water', 'nature', 'waves'],
      width: 4096,
      height: 2730,
    },
    {
      title: 'Forest Path',
      watermarkedCid: 'QmPbxeGcXhYQQNgsC6a36dDyYUcHgMLnGKnF8pVFmGsvqi',
      description: 'Serene path through dense forest',
      tags: ['forest', 'trees', 'nature', 'path'],
      width: 3000,
      height: 2000,
    },
    {
      title: 'City Lights at Night',
      watermarkedCid: 'QmPbxeGcXhYQQNgsC6a36dDyYUcHgMLnGKnF8pVFmGsvqi',
      description: 'Urban skyline illuminated after dark',
      tags: ['city', 'urban', 'night', 'lights'],
      width: 4000,
      height: 2667,
    },
    {
      title: 'Desert Landscape',
      watermarkedCid: 'QmPbxeGcXhYQQNgsC6a36dDyYUcHgMLnGKnF8pVFmGsvqi',
      description: 'Vast desert with rolling sand dunes',
      tags: ['desert', 'sand', 'landscape', 'nature'],
      width: 3840,
      height: 2560,
    },
    {
      title: 'Winter Wonderland',
      watermarkedCid: 'QmPbxeGcXhYQQNgsC6a36dDyYUcHgMLnGKnF8pVFmGsvqi',
      description: 'Snow-covered landscape in pristine winter',
      tags: ['winter', 'snow', 'nature', 'landscape'],
      width: 3200,
      height: 2133,
    },
    {
      title: 'Tropical Beach',
      watermarkedCid: 'QmWBgfBhyVmHNhBfEQ7p1P4Mpn7pm5b8KgSab2caELnTuV',
      description: 'Paradise beach with crystal clear water',
      tags: ['beach', 'tropical', 'ocean', 'vacation'],
      width: 4096,
      height: 2731,
    },
    {
      title: 'Mountain Lake',
      watermarkedCid: 'QmWBgfBhyVmHNhBfEQ7p1P4Mpn7pm5b8KgSab2caELnTuV',
      description: 'Reflective mountain lake at dawn',
      tags: ['lake', 'mountains', 'reflection', 'nature'],
      width: 3600,
      height: 2400,
    },
    {
      title: 'Cherry Blossoms',
      watermarkedCid: 'QmWBgfBhyVmHNhBfEQ7p1P4Mpn7pm5b8KgSab2caELnTuV',
      description: 'Beautiful cherry blossoms in full bloom',
      tags: ['flowers', 'spring', 'nature', 'pink'],
      width: 2880,
      height: 1920,
    },
    {
      title: 'Autumn Leaves',
      watermarkedCid: 'QmWBgfBhyVmHNhBfEQ7p1P4Mpn7pm5b8KgSab2caELnTuV',
      description: 'Vibrant autumn foliage in golden colors',
      tags: ['autumn', 'fall', 'leaves', 'nature'],
      width: 3456,
      height: 2304,
    },
    {
      title: 'Starry Night Sky',
      watermarkedCid: 'QmXEqPbvM4aq1SQSXN8DSuEcSo5SseYW1izYQbsGB8yn9x',
      description: 'Milky way galaxy over dark landscape',
      tags: ['stars', 'night', 'sky', 'astronomy'],
      width: 4000,
      height: 3000,
    },
    {
      title: 'Waterfall Cascade',
      watermarkedCid: 'QmXEqPbvM4aq1SQSXN8DSuEcSo5SseYW1izYQbsGB8yn9x',
      description: 'Powerful waterfall in lush rainforest',
      tags: ['waterfall', 'nature', 'water', 'forest'],
      width: 2560,
      height: 3840,
    },
    {
      title: 'Rocky Coastline',
      watermarkedCid: 'QmXEqPbvM4aq1SQSXN8DSuEcSo5SseYW1izYQbsGB8yn9x',
      description: 'Dramatic rocky coast with crashing waves',
      tags: ['coast', 'rocks', 'ocean', 'landscape'],
      width: 3840,
      height: 2160,
    },
    {
      title: 'Wildflower Meadow',
      watermarkedCid: 'QmPQdVU1riwzijhCs1Lk6CHmDo4LpmwPPLuDauY3i8gSzL',
      description: 'Colorful wildflowers in spring meadow',
      tags: ['flowers', 'meadow', 'spring', 'nature'],
      width: 3000,
      height: 2000,
    },
    {
      title: 'Foggy Bridge',
      watermarkedCid: 'QmPQdVU1riwzijhCs1Lk6CHmDo4LpmwPPLuDauY3i8gSzL',
      description: 'Mysterious bridge emerging from morning fog',
      tags: ['fog', 'bridge', 'atmosphere', 'moody'],
      width: 3200,
      height: 2133,
    },
    {
      title: 'Modern Architecture',
      watermarkedCid: 'QmPQdVU1riwzijhCs1Lk6CHmDo4LpmwPPLuDauY3i8gSzL',
      description: 'Contemporary building with striking design',
      tags: ['architecture', 'modern', 'building', 'urban'],
      width: 2400,
      height: 3600,
    },
    {
      title: 'Golden Hour Portrait',
      watermarkedCid: 'QmPQdVU1riwzijhCs1Lk6CHmDo4LpmwPPLuDauY3i8gSzL',
      description: 'Warm golden light during magic hour',
      tags: ['golden-hour', 'sunset', 'light', 'warm'],
      width: 3600,
      height: 2400,
    },
    {
      title: 'Urban Street Art',
      watermarkedCid: 'QmPQdVU1riwzijhCs1Lk6CHmDo4LpmwPPLuDauY3i8gSzL',
      description: 'Vibrant street art mural in city',
      tags: ['art', 'street', 'urban', 'colorful'],
      width: 3000,
      height: 4000,
    },
    {
      title: 'Misty Morning',
      watermarkedCid: 'QmcJYkCKK7QPmYWjp4FD2e3Lv5WCGFuHNUByvGKBaytif4',
      description: 'Ethereal mist over peaceful countryside',
      tags: ['mist', 'morning', 'landscape', 'peaceful'],
      width: 4096,
      height: 2730,
    },
    {
      title: 'Neon Signs',
      watermarkedCid: 'QmcJYkCKK7QPmYWjp4FD2e3Lv5WCGFuHNUByvGKBaytif4',
      description: 'Colorful neon signs in night city',
      tags: ['neon', 'night', 'city', 'urban'],
      width: 3200,
      height: 2400,
    },
    {
      title: 'Snow-capped Peaks',
      watermarkedCid: 'QmcJYkCKK7QPmYWjp4FD2e3Lv5WCGFuHNUByvGKBaytif4',
      description: 'Majestic mountain peaks with snow',
      tags: ['mountains', 'snow', 'peaks', 'landscape'],
      width: 4000,
      height: 2667,
    },
    {
      title: 'Rustic Barn',
      watermarkedCid: 'QmcJYkCKK7QPmYWjp4FD2e3Lv5WCGFuHNUByvGKBaytif4',
      description: 'Old wooden barn in rural setting',
      tags: ['rural', 'barn', 'rustic', 'countryside'],
      width: 3456,
      height: 2304,
    },
    {
      title: 'Marina at Dusk',
      watermarkedCid: 'QmcJYkCKK7QPmYWjp4FD2e3Lv5WCGFuHNUByvGKBaytif4',
      description: 'Boats in harbor during golden hour',
      tags: ['marina', 'boats', 'dusk', 'water'],
      width: 3840,
      height: 2160,
    },
    {
      title: 'Ancient Ruins',
      watermarkedCid: 'QmcJYkCKK7QPmYWjp4FD2e3Lv5WCGFuHNUByvGKBaytif4',
      description: 'Historical ruins with dramatic sky',
      tags: ['ruins', 'history', 'architecture', 'ancient'],
      width: 3000,
      height: 2000,
    },
    {
      title: 'Coffee Shop Interior',
      watermarkedCid: 'QmcJYkCKK7QPmYWjp4FD2e3Lv5WCGFuHNUByvGKBaytif4',
      description: 'Cozy coffee shop with warm ambiance',
      tags: ['interior', 'coffee', 'cozy', 'warm'],
      width: 2880,
      height: 1920,
    },
    {
      title: 'Rainy Day Reflections',
      watermarkedCid: 'QmcJYkCKK7QPmYWjp4FD2e3Lv5WCGFuHNUByvGKBaytif4',
      description: 'City reflections on wet pavement',
      tags: ['rain', 'reflection', 'urban', 'moody'],
      width: 3600,
      height: 2400,
    },
    {
      title: 'Colorful Market',
      watermarkedCid: 'QmcJYkCKK7QPmYWjp4FD2e3Lv5WCGFuHNUByvGKBaytif4',
      description: 'Vibrant market with fresh produce',
      tags: ['market', 'colorful', 'food', 'culture'],
      width: 3200,
      height: 2400,
    },
    {
      title: 'Vintage Car',
      watermarkedCid: 'QmcJYkCKK7QPmYWjp4FD2e3Lv5WCGFuHNUByvGKBaytif4',
      description: 'Classic vintage automobile',
      tags: ['vintage', 'car', 'classic', 'retro'],
      width: 4096,
      height: 2730,
    },
    {
      title: 'Desert Sunset',
      watermarkedCid: 'QmcJYkCKK7QPmYWjp4FD2e3Lv5WCGFuHNUByvGKBaytif4',
      description: 'Golden sunset over desert dunes',
      tags: ['desert', 'sunset', 'dunes', 'landscape'],
      width: 3840,
      height: 2160,
    },
    {
      title: 'Modern Skyscraper',
      watermarkedCid: 'QmcJYkCKK7QPmYWjp4FD2e3Lv5WCGFuHNUByvGKBaytif4',
      description: 'Tall glass skyscraper reaching skyward',
      tags: ['skyscraper', 'modern', 'architecture', 'urban'],
      width: 2400,
      height: 3600,
    },
  ];

  const sampleAddresses = [
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    '0x3f17f1962B36e491b30A40b2405849e597Ba5Fb5',
    '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
    '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E',
  ];

  const imagesToInsert = [];

  for (let i = 0; i < count; i++) {
    const imageData = realImages[i % realImages.length];

    // Generate random encryption key for this image
    const imageEncryptionKey = crypto.randomBytes(32).toString('hex');

    // Encrypt the key with master key before storing
    const encryptedKey = encryptWithMasterKey(imageEncryptionKey, masterKey);

    // For encrypted version, we'll use a fake CID
    // In production, this would be the actual encrypted file CID
    const encryptedCid = `bafy${crypto.randomBytes(32).toString('hex').slice(0, 56)}`;

    const image = {
      encryptedCid,
      watermarkedCid: imageData.watermarkedCid,
      encryptionKey: encryptedKey,
      photographerAddress: sampleAddresses[i % sampleAddresses.length],
      title: imageData.title,
      description: imageData.description,
      tags: imageData.tags,
      priceUsdc: (Math.random() * 10 + 0.5).toFixed(2),
      width: imageData.width,
      height: imageData.height,
    };

    imagesToInsert.push(image);
  }

  const insertedImages = await db.insert(images).values(imagesToInsert).returning();

  console.log(`✓ Seeded ${insertedImages.length} images to database`);
  return insertedImages;
}

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Database seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error seeding database:', error);
      process.exit(1);
    });
}
