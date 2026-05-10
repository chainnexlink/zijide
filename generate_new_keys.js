const crypto = require('crypto');
const fs = require('fs');

// Generate new RSA 2048 key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Save new keys
fs.writeFileSync('merchant_private_key_new.pem', privateKey);
fs.writeFileSync('merchant_public_key_new.pem', publicKey);

// Extract base64 for dashboard upload (no headers, no newlines)
const pubB64 = publicKey
  .replace(/-----[A-Z ]+-----/g, '')
  .replace(/\s/g, '');

console.log('=== New Key Pair Generated ===\n');
console.log('New private key saved to: merchant_private_key_new.pem');
console.log('New public key saved to: merchant_public_key_new.pem\n');
console.log('=== Copy this public key to LianLian dashboard ===\n');
console.log(pubB64);
console.log('\n=== End ===');

// Verify the new key pair works
const testData = '20260426000000&{"test":true}';
const sig = crypto.sign('SHA256', Buffer.from(testData), privateKey);
const ok = crypto.verify('SHA256', Buffer.from(testData), publicKey, sig);
console.log('\nNew key pair sign/verify test:', ok);

// Also show the original public key base64 for comparison
const origPub = fs.readFileSync('merchant_public_key.pem', 'utf-8');
const origB64 = origPub.replace(/-----[A-Z ]+-----/g, '').replace(/\s/g, '');
console.log('\n=== Original public key (for reference) ===\n');
console.log(origB64);
console.log('\nKeys are different:', pubB64 !== origB64);
