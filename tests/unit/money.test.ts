import { describe, it, expect } from 'vitest';
import { formatINR, numberToWordsIndian, toPaise, toRupees } from '@/lib/calculations/money';

describe('Money Conversion & Formatting', () => {
  it('converts decimal rupee numbers to integer paise correctly', () => {
    expect(toPaise(100)).toBe(10000);
    expect(toPaise(19.99)).toBe(1999);
    expect(toPaise(0.05)).toBe(5);
    expect(toPaise(0)).toBe(0);
    expect(toPaise(123456.78)).toBe(12345678);
  });

  it('converts string rupee amounts with commas to integer paise', () => {
    expect(toPaise('1,234.50')).toBe(123450);
    expect(toPaise(' 500 ')).toBe(50000);
    expect(toPaise('0.99')).toBe(99);
    expect(toPaise('invalid')).toBe(0);
  });

  it('converts paise back to decimal rupee numbers', () => {
    expect(toRupees(10000)).toBe(100);
    expect(toRupees(1999)).toBe(19.99);
    expect(toRupees(5)).toBe(0.05);
    expect(toRupees(0)).toBe(0);
  });

  it('formats integer paise into standard Indian numbering format (₹#,##,###.##)', () => {
    expect(formatINR(12345678)).toBe('₹1,23,456.78');
    expect(formatINR(50000)).toBe('₹500.00');
    expect(formatINR(1000000000)).toBe('₹1,00,00,000.00');
    expect(formatINR(99)).toBe('₹0.99');
    expect(formatINR(0)).toBe('₹0.00');
    expect(formatINR(-5000)).toBe('-₹50.00');
  });

  it('formats without currency symbol when option is disabled', () => {
    expect(formatINR(12345678, { showSymbol: false })).toBe('1,23,456.78');
  });

  it('converts paise to Indian English words', () => {
    expect(numberToWordsIndian(12345678)).toBe(
      'Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six and Seventy Eight Paise Only'
    );
    expect(numberToWordsIndian(50000)).toBe('Rupees Five Hundred Only');
    expect(numberToWordsIndian(1000000000)).toBe('Rupees One Crore Only');
    expect(numberToWordsIndian(50)).toBe('Rupees Zero and Fifty Paise Only');
    expect(numberToWordsIndian(0)).toBe('Rupees Zero Only');
  });
});
