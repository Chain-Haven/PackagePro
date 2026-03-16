import { describe, test, expect } from 'vitest';
import {
  OrganizationSchema,
  MembershipRole,
  OrderVideoStatus,
} from '../types';
import {
  LockOrderRequestSchema,
  CreateLabelRequestSchema,
  OrdersListQuerySchema,
} from '../api';

describe('Zod schemas', () => {
  test('OrganizationSchema validates correctly', () => {
    const valid = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Org',
      slug: 'test-org',
      plan: 'free',
      settings: {},
      created_at: '2024-01-01T00:00:00.000Z',
    };
    expect(OrganizationSchema.safeParse(valid).success).toBe(true);

    const invalid = { id: 'not-uuid', name: '' };
    expect(OrganizationSchema.safeParse(invalid).success).toBe(false);
  });

  test('MembershipRole enum', () => {
    expect(MembershipRole.safeParse('org_owner').success).toBe(true);
    expect(MembershipRole.safeParse('packer').success).toBe(true);
    expect(MembershipRole.safeParse('invalid_role').success).toBe(false);
  });

  test('OrderVideoStatus enum', () => {
    const valid = ['none', 'recording', 'uploading', 'ready', 'failed', 'deleted'];
    valid.forEach((s) => expect(OrderVideoStatus.safeParse(s).success).toBe(true));
    expect(OrderVideoStatus.safeParse('unknown').success).toBe(false);
  });

  test('LockOrderRequestSchema', () => {
    expect(
      LockOrderRequestSchema.safeParse({
        station_id: '550e8400-e29b-41d4-a716-446655440000',
      }).success
    ).toBe(true);

    expect(
      LockOrderRequestSchema.safeParse({
        station_id: '550e8400-e29b-41d4-a716-446655440000',
        duration_minutes: 60,
      }).success
    ).toBe(true);

    expect(
      LockOrderRequestSchema.safeParse({
        station_id: 'not-uuid',
      }).success
    ).toBe(false);
  });

  test('OrdersListQuerySchema with defaults', () => {
    const result = OrdersListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.per_page).toBe(25);
  });

  test('CreateLabelRequestSchema', () => {
    const valid = {
      order_id: '550e8400-e29b-41d4-a716-446655440000',
      carrier_id: 'se-123',
      service_code: 'usps_priority_mail',
      ship_from: {
        name: 'Warehouse',
        address_line1: '123 Main St',
        city_locality: 'New York',
        state_province: 'NY',
        postal_code: '10001',
        country_code: 'US',
      },
      packages: [{ weight: { value: 16, unit: 'ounce' as const } }],
    };
    expect(CreateLabelRequestSchema.safeParse(valid).success).toBe(true);
  });
});
