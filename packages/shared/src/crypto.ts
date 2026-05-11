import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
  createHmac,
  timingSafeEqual,
} from 'crypto';
import { ENCRYPTION_ALGORITHM } from './constants';

const ENCRYPTED_SEGMENT = /^[0-9a-f]+$/i;

export function encrypt(plaintext: string, key: string): string {
  const iv = randomBytes(16);
  const keyBuffer = Buffer.from(key, 'hex');
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedData: string, key: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const keyBuffer = Buffer.from(key, 'hex');
  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function isEncryptedValue(value: string | null | undefined): value is string {
  if (!value) return false;
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  return parts.every(
    (part) => part.length > 0 && part.length % 2 === 0 && ENCRYPTED_SEGMENT.test(part)
  );
}

export function encryptIfNeeded(plaintext: string, key: string): string {
  return isEncryptedValue(plaintext) ? plaintext : encrypt(plaintext, key);
}

export function decryptIfNeeded(value: string, key: string): string {
  return isEncryptedValue(value) ? decrypt(value, key) : value;
}

export function generateToken(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generatePairingCode(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(length);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
}

export function generateHmac(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyHmac(payload: string, secret: string, signature: string): boolean {
  const expected = generateHmac(payload, secret);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
