import { describe, expect, it } from 'vitest';
import { verifyViewerAccess } from '../viewer-verification';

describe('verifyViewerAccess', () => {
  it('requires both email and zip when both are available', () => {
    expect(
      verifyViewerAccess({
        email: 'customer@example.com',
        postalCode: '83701',
        orderEmail: 'customer@example.com',
        orderZip: '90210',
      })
    ).toBe(false);
  });

  it('accepts a single available verification factor when only one exists', () => {
    expect(
      verifyViewerAccess({
        email: 'customer@example.com',
        orderEmail: 'customer@example.com',
      })
    ).toBe(true);
  });
});
