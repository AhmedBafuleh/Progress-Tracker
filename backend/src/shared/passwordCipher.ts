import crypto from 'node:crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const VERSION = 'v1';

function getKey() {
  return Buffer.from(env.PASSWORD_ENCRYPTION_KEY, 'hex');
}

export function encryptPassword(password: string) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [VERSION, iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join('.');
}

export function decryptPassword(payload: string) {
  const [version, ivHex, tagHex, encryptedHex] = payload.split('.');

  if (version !== VERSION || !ivHex || !tagHex || !encryptedHex) {
    throw new Error('Invalid encrypted password payload');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
