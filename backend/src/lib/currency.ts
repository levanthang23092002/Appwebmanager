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
