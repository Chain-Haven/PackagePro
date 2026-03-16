import { describe, expect, it } from 'vitest';
import { sortRatesByAmount } from '../shipping-rates';

describe('shipping rates', () => {
  it('returns a sorted copy without mutating the original array', () => {
    const rates = [
      { rate_id: 'slow', shipping_amount: { amount: 9.99 } },
      { rate_id: 'fast', shipping_amount: { amount: 4.99 } },
    ];

    const sorted = sortRatesByAmount(rates);

    expect(sorted.map((rate) => rate.rate_id)).toEqual(['fast', 'slow']);
    expect(rates.map((rate) => rate.rate_id)).toEqual(['slow', 'fast']);
  });
});
