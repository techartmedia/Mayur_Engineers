import { describe, it, expect } from 'vitest';
import {
  formatInvoiceNumber,
  getFinancialYear,
  parseInvoiceNumber,
} from '@/lib/numbering/sequence-allocator';

describe('Invoice Numbering & Financial Year Calculations', () => {
  describe('getFinancialYear', () => {
    it('returns 26-27 for dates between April 1, 2026 and March 31, 2027', () => {
      // April 1, 2026
      expect(getFinancialYear(new Date(2026, 3, 1))).toBe('26-27');
      // November 5, 2026
      expect(getFinancialYear(new Date(2026, 10, 5))).toBe('26-27');
      // December 31, 2026
      expect(getFinancialYear(new Date(2026, 11, 31))).toBe('26-27');
      // January 1, 2027
      expect(getFinancialYear(new Date(2027, 0, 1))).toBe('26-27');
      // March 31, 2027
      expect(getFinancialYear(new Date(2027, 2, 31))).toBe('26-27');
    });

    it('rolls over to 27-28 on April 1, 2027', () => {
      expect(getFinancialYear(new Date(2027, 3, 1))).toBe('27-28');
    });

    it('handles full 4-digit start year format', () => {
      expect(getFinancialYear(new Date(2026, 6, 15), 'full')).toBe('2026-27');
    });
  });

  describe('formatInvoiceNumber', () => {
    it('formats with default padding of 3 digits', () => {
      expect(formatInvoiceNumber('ME', '26-27', 1)).toBe('ME/26-27/001');
      expect(formatInvoiceNumber('ME', '26-27', 42)).toBe('ME/26-27/042');
      expect(formatInvoiceNumber('ME', '26-27', 100)).toBe('ME/26-27/100');
      expect(formatInvoiceNumber('ME', '26-27', 1234)).toBe('ME/26-27/1234');
    });

    it('supports custom prefix (e.g. TEST in development or QT for quotations)', () => {
      expect(formatInvoiceNumber('TEST', '26-27', 1)).toBe('TEST/26-27/001');
      expect(formatInvoiceNumber('QT', '26-27', 5)).toBe('QT/26-27/005');
    });
  });

  describe('parseInvoiceNumber', () => {
    it('correctly deconstructs a valid invoice number string', () => {
      const parsed = parseInvoiceNumber('ME/26-27/042');
      expect(parsed).toEqual({
        prefix: 'ME',
        financialYear: '26-27',
        sequence: 42,
      });
    });

    it('returns null for invalid invoice numbers', () => {
      expect(parseInvoiceNumber('ME-001')).toBeNull();
      expect(parseInvoiceNumber('')).toBeNull();
      expect(parseInvoiceNumber('ME/26-27/ABC')).toBeNull();
    });
  });
});
