import crypto from 'node:crypto';

import { authSecret } from '@root/config/constants';

const IV = new Uint8Array(Buffer.alloc(16, 0));

if (!authSecret) {
  throw new Error('The AUTH_SECRET env var is required to encrypt data');
}

const KEY = new Uint8Array(crypto.createHash('sha256').update(authSecret).digest());

export function encrypt(data: string): string {
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, IV);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

export function decrypt(encryptedData: string): string {
  const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, IV);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
