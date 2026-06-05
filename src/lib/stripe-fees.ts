const DEFAULT_STRIPE_FEE_PERCENT = 0.029;
const DEFAULT_STRIPE_FEE_FIXED = 0.3;

export function getStripeFeeConfig() {
  const percentage = Number(
    process.env.NEXT_PUBLIC_STRIPE_FEE_PERCENT ||
    process.env.STRIPE_FEE_PERCENT ||
    DEFAULT_STRIPE_FEE_PERCENT
  );
  const fixedByCurrency: Record<string, number> = {
    usd: Number(
      process.env.NEXT_PUBLIC_STRIPE_FEE_FIXED_USD ||
      process.env.STRIPE_FEE_FIXED_USD ||
      DEFAULT_STRIPE_FEE_FIXED
    ),
    htg: Number(
      process.env.NEXT_PUBLIC_STRIPE_FEE_FIXED_HTG ||
      process.env.STRIPE_FEE_FIXED_HTG ||
      DEFAULT_STRIPE_FEE_FIXED
    ),
  };

  return {
    percentage: Number.isFinite(percentage) && percentage >= 0 ? percentage : DEFAULT_STRIPE_FEE_PERCENT,
    fixedByCurrency,
  };
}

export function estimateStripeFeeCoverage(amount: number, currency: string) {
  const normalized = currency.toLowerCase();
  const { percentage, fixedByCurrency } = getStripeFeeConfig();
  const fixedFee = fixedByCurrency[normalized] ?? DEFAULT_STRIPE_FEE_FIXED;

  if (amount <= 0) {
    return {
      baseAmount: 0,
      feeAmount: 0,
      totalAmount: 0,
    };
  }

  const grossAmount = (amount + fixedFee) / (1 - percentage);
  const totalAmount = Math.round(grossAmount * 100) / 100;
  const feeAmount = Math.max(Math.round((totalAmount - amount) * 100) / 100, 0);

  return {
    baseAmount: Math.round(amount * 100) / 100,
    feeAmount,
    totalAmount,
  };
}
