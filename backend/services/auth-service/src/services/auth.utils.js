const crypto = require('crypto');
const { authenticator } = require('otplib');

function generateRandomToken(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

function hashValue(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function generateOtp(digits = 6) {
  const max = 10 ** digits;
  const code = Math.floor(Math.random() * max).toString().padStart(digits, '0');
  return code;
}

function encryptSecret(secret, encryptionKey) {
  if (!encryptionKey) return secret;
  const key = crypto.createHash('sha256').update(encryptionKey).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

function decryptSecret(value, encryptionKey) {
  if (!encryptionKey) return value;
  const key = crypto.createHash('sha256').update(encryptionKey).digest();
  const [ivB64, tagB64, encryptedB64] = String(value).split('.');
  if (!ivB64 || !tagB64 || !encryptedB64) return value;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(encryptedB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

function generateTotpSecret() {
  return authenticator.generateSecret();
}

function verifyTotp(token, secret) {
  return authenticator.check(token, secret);
}

function generateRecoveryCodes(count = 5) {
  return Array.from({ length: count }, () => generateRandomToken(8));
}

module.exports = {
  generateRandomToken,
  hashValue,
  generateOtp,
  encryptSecret,
  decryptSecret,
  generateTotpSecret,
  verifyTotp,
  generateRecoveryCodes,
};
