export type OrdersPageQuery = {
  page: number;
  perPage: number;
  search: string;
  status: string;
  videoStatus: string;
};

export function parseOrdersPageQuery(
  searchParams: Record<string, string | string[] | undefined>
): OrdersPageQuery {
  const getValue = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
  };

  const page = Math.max(Number.parseInt(getValue('page') || '1', 10) || 1, 1);
  const perPage = Math.min(
    Math.max(Number.parseInt(getValue('per_page') || '25', 10) || 25, 1),
    100
  );

  return {
    page,
    perPage,
    search: getValue('search').trim(),
    status: getValue('status').trim(),
    videoStatus: getValue('video_status').trim(),
  };
}
