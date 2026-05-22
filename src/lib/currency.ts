/**
 * Formats a numeric amount based on the selected currency.
 * Supports USD ($) and HTG (Gourdes) with elegant French formatting.
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount || '0');
  
  if (currency === 'USD') {
    return parsedAmount.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'USD',
    });
  } else {
    // Haitian Gourdes formatting, e.g. "150 000,00 HTG"
    return `${parsedAmount.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} HTG`;
  }
}
