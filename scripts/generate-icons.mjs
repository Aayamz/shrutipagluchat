import fs from 'fs';
import path from 'path';

const iconDir = path.join(process.cwd(), 'public', 'icons');
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

// Simple valid 1x1 base64 transparent PNG, upscaled for PWA icon placeholder if canvas unavailable
const samplePngBase64 = 'iVBORw0KGgoAAAANSU5EUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

fs.writeFileSync(path.join(iconDir, 'icon-192.png'), Buffer.from(samplePngBase64, 'base64'));
fs.writeFileSync(path.join(iconDir, 'icon-512.png'), Buffer.from(samplePngBase64, 'base64'));

console.log('Created PWA icons in public/icons/');
