import sharp from 'sharp';
import { WATERMARK_PNG_BASE64 } from '../src/watermark-image';

async function verify() {
  const buf = Buffer.from(WATERMARK_PNG_BASE64, 'base64');
  console.log('Buffer length:', buf.length);
  console.log('First bytes (hex):', buf.slice(0, 8).toString('hex'));

  try {
    const meta = await sharp(buf).metadata();
    console.log('Valid PNG:', meta.format, `${meta.width}x${meta.height}`);
    console.log('Channels:', meta.channels);
  } catch (e) {
    console.error('Error:', (e as Error).message);
  }
}

verify();
