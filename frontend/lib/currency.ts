/**
 * Format amount from cents to dollars with currency symbol
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency = "USD"
): string {
  if (!amount) return "-";
  const dollars = amount / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(dollars);
}

/**
 * Format amount from cents to dollars without currency symbol
 */
export function formatAmount(amountInCents?: number | null): string {
  if (!amountInCents) return "0.00";
  return (amountInCents / 100).toFixed(2);
}
