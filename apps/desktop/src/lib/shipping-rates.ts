type RateLike = {
  shipping_amount: {
    amount: number;
  };
};

export function sortRatesByAmount<T extends RateLike>(rates: T[]) {
  return [...rates].sort((a, b) => a.shipping_amount.amount - b.shipping_amount.amount);
}
