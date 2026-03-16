import { describe, test, expect } from 'vitest';
import {
  encrypt,
  decrypt,
  generateToken,
  hashToken,
  generatePairingCode,
  generateHmac,
  verifyHmac,
} from '../crypto';
import { randomBytes } from 'crypto';

describe('crypto utilities', () => {
  const testKey = randomBytes(32).toString('hex');

  test('encrypt and decrypt round trip', () => {
    const plaintext = 'ck_test_api_key_12345';
    const encrypted = encrypt(plaintext, testKey);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.split(':')).toHaveLength(3);

    const decrypted = decrypt(encrypted, testKey);
    expect(decrypted).toBe(plaintext);
  });

  test('different plaintexts produce different ciphertexts', () => {
    const a = encrypt('secret_a', testKey);
    const b = encrypt('secret_b', testKey);
    expect(a).not.toBe(b);
  });

  test('same plaintext produces different ciphertexts (random IV)', () => {
    const a = encrypt('same_secret', testKey);
    const b = encrypt('same_secret', testKey);
    expect(a).not.toBe(b);
  });

  test('decrypt with wrong key fails', () => {
    const encrypted = encrypt('secret', testKey);
    const wrongKey = randomBytes(32).toString('hex');
    expect(() => decrypt(encrypted, wrongKey)).toThrow();
  });

  test('generateToken returns hex string of correct length', () => {
    const token16 = generateToken(16);
    expect(token16).toHaveLength(32); // hex = 2x bytes

    const token32 = generateToken(32);
    expect(token32).toHaveLength(64);
  });

  test('hashToken is deterministic', () => {
    const token = 'test_token_123';
    expect(hashToken(token)).toBe(hashToken(token));
  });

  test('hashToken produces different hashes for different tokens', () => {
    expect(hashToken('token_a')).not.toBe(hashToken('token_b'));
  });

  test('generatePairingCode returns uppercase alphanumeric', () => {
    const code = generatePairingCode(8);
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  test('HMAC generation and verification', () => {
    const payload = '{"order_id": 123}';
    const secret = 'webhook_secret_key';

    const sig = generateHmac(payload, secret);
    expect(sig).toBeTruthy();
    expect(verifyHmac(payload, secret, sig)).toBe(true);
    expect(verifyHmac(payload, secret, 'wrong_signature')).toBe(false);
    expect(verifyHmac('different_payload', secret, sig)).toBe(false);
  });
});
