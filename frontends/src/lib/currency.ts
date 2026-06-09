export const DEFAULT_USD_VND_RATE = 27000;

export type CurrencyCode = 'USD' | 'VND';

export function normalizeCurrency(raw: unknown, fallback: CurrencyCode = 'USD'): CurrencyCode {
  const c = String(raw ?? fallback).trim().toUpperCase();
  return c === 'VND' ? 'VND' : 'USD';
}

export function normalizeUsdVndRate(raw: unknown, fallback = DEFAULT_USD_VND_RATE): number {
  const n = parseFloat(String(raw ?? ''));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

export function toUsd(amount: number, currency: CurrencyCode, usdVndRate: number): number {
  if (currency === 'USD') return amount;
  const rate = normalizeUsdVndRate(usdVndRate);
  return amount / rate;
}

export function toVnd(amount: number, currency: CurrencyCode, usdVndRate: number): number {
  if (currency === 'VND') return amount;
  const rate = normalizeUsdVndRate(usdVndRate);
  return amount * rate;
}

export function convertAmount(
  amount: number,
  currency: string,
  usdVndRate: number,
  display: CurrencyCode
): number {
  const c = normalizeCurrency(currency);
  return display === 'USD' ? toUsd(amount, c, usdVndRate) : toVnd(amount, c, usdVndRate);
}

export function formatMoney(amount: number, currency: CurrencyCode): string {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }
  return `${amount.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} ₫`;
}

export function formatOriginalMoney(amount: number, currency: string): string {
  return formatMoney(amount, normalizeCurrency(currency));
}

export function formatCompactMoney(amount: number, currency: CurrencyCode): string {
  const abs = Math.abs(amount);
  if (currency === 'USD') {
    if (abs >= 1_000_000) return `$${(amount / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`;
    if (abs >= 1_000) return `$${(amount / 1_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K`;
    return formatMoney(amount, 'USD');
  }
  if (abs >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`;
  }
  if (abs >= 1_000_000) {
    return `${(amount / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  }
  return formatMoney(amount, 'VND');
}
