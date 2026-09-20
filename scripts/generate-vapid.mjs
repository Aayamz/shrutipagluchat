import webpush from 'web-push';

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n=============================================');
console.log('  ShrutiPagluChat VAPID Keys Generated!');
console.log('=============================================\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('\nCopy these values into your .env.local file and Vercel Environment Variables.\n');
