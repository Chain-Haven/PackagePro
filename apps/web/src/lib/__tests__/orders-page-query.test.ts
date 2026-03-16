import { describe, expect, it } from 'vitest';
import { parseOrdersPageQuery } from '../orders/orders-page-query';

describe('parseOrdersPageQuery', () => {
  it('applies defaults when query params are missing', () => {
    expect(parseOrdersPageQuery({})).toEqual({
      page: 1,
      perPage: 25,
      search: '',
      status: '',
      videoStatus: '',
    });
  });

  it('normalizes paging bounds and filter strings', () => {
    expect(
      parseOrdersPageQuery({
        page: '0',
        per_page: '500',
        search: ' order-123 ',
        status: 'processing',
        video_status: 'uploading',
      })
    ).toEqual({
      page: 1,
      perPage: 100,
      search: 'order-123',
      status: 'processing',
      videoStatus: 'uploading',
    });
  });
});
