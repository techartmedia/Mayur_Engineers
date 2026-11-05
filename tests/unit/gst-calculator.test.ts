import { describe, it, expect } from 'vitest';
import {
  calculateDocument,
  calculateLineItem,
} from '@/lib/calculations/gst-calculator';
import { LineItemInput } from '@/lib/calculations/types';

describe('GST Calculation Engine', () => {
  describe('calculateLineItem - Intra-State (CGST + SGST)', () => {
    it('calculates 18% GST split evenly into 9% CGST and 9% SGST', () => {
      const item: LineItemInput = {
        description: 'CNC Machined Component',
        quantity: 10,
        unitPricePaise: 10000, // ₹100.00
        gstRate: 18,
      };

      const result = calculateLineItem(item, false);

      expect(result.grossAmountPaise).toBe(100000); // ₹1,000.00
      expect(result.taxableValuePaise).toBe(100000);
      expect(result.cgstRate).toBe(9);
      expect(result.sgstRate).toBe(9);
      expect(result.igstRate).toBe(0);
      expect(result.cgstAmountPaise).toBe(9000); // ₹90.00
      expect(result.sgstAmountPaise).toBe(9000); // ₹90.00
      expect(result.igstAmountPaise).toBe(0);
      expect(result.totalTaxPaise).toBe(18000); // ₹180.00
      expect(result.totalLineAmountPaise).toBe(118000); // ₹1,180.00
    });

    it('calculates 5% GST split into 2.5% CGST and 2.5% SGST', () => {
      const item: LineItemInput = {
        description: 'Raw Metal Casting',
        quantity: 2,
        unitPricePaise: 25000, // ₹250.00
        gstRate: 5,
      };

      const result = calculateLineItem(item, false);

      expect(result.grossAmountPaise).toBe(50000); // ₹500.00
      expect(result.cgstRate).toBe(2.5);
      expect(result.sgstRate).toBe(2.5);
      expect(result.cgstAmountPaise).toBe(1250); // ₹12.50
      expect(result.sgstAmountPaise).toBe(1250); // ₹12.50
      expect(result.totalTaxPaise).toBe(2500); // ₹25.00
      expect(result.totalLineAmountPaise).toBe(52500); // ₹525.00
    });

    it('applies line discounts before computing taxable value and tax', () => {
      const item: LineItemInput = {
        description: 'Custom Tooling Fixture',
        quantity: 1,
        unitPricePaise: 100000, // ₹1,000.00
        discountPaise: 20000, // ₹200.00 discount
        gstRate: 18,
      };

      const result = calculateLineItem(item, false);

      expect(result.grossAmountPaise).toBe(100000);
      expect(result.effectiveDiscountPaise).toBe(20000);
      expect(result.taxableValuePaise).toBe(80000); // ₹800.00
      expect(result.cgstAmountPaise).toBe(7200); // 9% of ₹800 = ₹72.00
      expect(result.sgstAmountPaise).toBe(7200); // 9% of ₹800 = ₹72.00
      expect(result.totalLineAmountPaise).toBe(94400); // ₹800 + ₹144 = ₹944.00
    });
  });

  describe('calculateLineItem - Inter-State (IGST)', () => {
    it('calculates full 18% IGST with zero CGST/SGST', () => {
      const item: LineItemInput = {
        description: 'Export Component to Gujarat',
        quantity: 5,
        unitPricePaise: 20000, // ₹200.00
        gstRate: 18,
      };

      const result = calculateLineItem(item, true);

      expect(result.grossAmountPaise).toBe(100000); // ₹1,000.00
      expect(result.taxableValuePaise).toBe(100000);
      expect(result.cgstRate).toBe(0);
      expect(result.sgstRate).toBe(0);
      expect(result.cgstAmountPaise).toBe(0);
      expect(result.sgstAmountPaise).toBe(0);
      expect(result.igstRate).toBe(18);
      expect(result.igstAmountPaise).toBe(18000); // ₹180.00
      expect(result.totalLineAmountPaise).toBe(118000); // ₹1,180.00
    });
  });

  describe('calculateLineItem - Bill of Supply', () => {
    it('collects 0% tax for Bill of Supply even if item has gstRate', () => {
      const item: LineItemInput = {
        description: 'Exempt Supply or Composition',
        quantity: 10,
        unitPricePaise: 15000,
        gstRate: 18,
      };

      const result = calculateLineItem(item, false, 'BILL_OF_SUPPLY');

      expect(result.taxableValuePaise).toBe(150000);
      expect(result.cgstAmountPaise).toBe(0);
      expect(result.sgstAmountPaise).toBe(0);
      expect(result.igstAmountPaise).toBe(0);
      expect(result.totalTaxPaise).toBe(0);
      expect(result.totalLineAmountPaise).toBe(150000);
    });
  });

  describe('calculateDocument - Whole Document & Round-off', () => {
    it('computes multi-item intra-state invoice with exact totals and round-off', () => {
      const doc = calculateDocument({
        supplierStateCode: '27', // Maharashtra
        placeOfSupplyStateCode: '27', // Maharashtra (Intra-state)
        items: [
          {
            description: 'Item 1 (18%)',
            quantity: 3,
            unitPricePaise: 33333, // ₹333.33 -> gross ₹999.99 = 99999 paise
            gstRate: 18,
          },
          {
            description: 'Item 2 (12%)',
            quantity: 1,
            unitPricePaise: 50050, // ₹500.50 = 50050 paise
            gstRate: 12,
          },
        ],
      });

      expect(doc.isInterState).toBe(false);
      expect(doc.items).toHaveLength(2);

      // Item 1: 99999 paise, 9% CGST = round(8999.91) = 9000, 9% SGST = 9000
      // Item 2: 50050 paise, 6% CGST = round(3003) = 3003, 6% SGST = 3003
      expect(doc.totalTaxableAmountPaise).toBe(99999 + 50050); // 150049 paise
      expect(doc.totalCgstPaise).toBe(9000 + 3003); // 12003 paise
      expect(doc.totalSgstPaise).toBe(9000 + 3003); // 12003 paise
      expect(doc.totalIgstPaise).toBe(0);
      expect(doc.totalTaxPaise).toBe(24006); // 12003 + 12003 = 24006

      // Raw total: 150049 + 24006 = 174055 paise (₹1,740.55)
      expect(doc.rawTotalPaise).toBe(174055);

      // 174055 / 100 = 1740.55 -> rounds to 1741 rupees = 174100 paise
      expect(doc.netTotalPaise).toBe(174100); // ₹1,741.00
      expect(doc.roundOffPaise).toBe(45); // +0.45 (+45 paise)
    });

    it('handles negative round-off when fractional paise is under 50', () => {
      const doc = calculateDocument({
        supplierStateCode: '27',
        placeOfSupplyStateCode: '27',
        items: [
          {
            description: 'Item',
            quantity: 1,
            unitPricePaise: 10020, // ₹100.20
            gstRate: 0,
          },
        ],
      });

      // Raw total: 10020 paise (₹100.20)
      // Nearest rupee: 10000 paise (₹100.00)
      expect(doc.rawTotalPaise).toBe(10020);
      expect(doc.netTotalPaise).toBe(10000);
      expect(doc.roundOffPaise).toBe(-20); // -₹0.20
    });

    it('correctly identifies inter-state supply between different state codes', () => {
      const doc = calculateDocument({
        supplierStateCode: '27', // Maharashtra
        placeOfSupplyStateCode: '24', // Gujarat
        items: [
          {
            description: 'Interstate goods',
            quantity: 1,
            unitPricePaise: 100000,
            gstRate: 18,
          },
        ],
      });

      expect(doc.isInterState).toBe(true);
      expect(doc.totalCgstPaise).toBe(0);
      expect(doc.totalSgstPaise).toBe(0);
      expect(doc.totalIgstPaise).toBe(18000);
      expect(doc.netTotalPaise).toBe(118000);
    });
  });
});
