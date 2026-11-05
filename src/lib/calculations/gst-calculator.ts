import {
  DocumentCalculationInput,
  DocumentCalculationOutput,
  LineItemCalculated,
  LineItemInput,
  Paise,
} from './types';

/**
 * Calculates financial amounts and GST splits for an individual invoice line item.
 */
export function calculateLineItem(
  item: LineItemInput,
  isInterState: boolean,
  documentType: 'TAX_INVOICE' | 'BILL_OF_SUPPLY' = 'TAX_INVOICE'
): LineItemCalculated {
  // Gross amount before discount
  const grossAmountPaise: Paise = Math.round(item.quantity * item.unitPricePaise);

  // Line-level discount (cannot exceed gross amount)
  const effectiveDiscountPaise: Paise = Math.min(
    grossAmountPaise,
    Math.max(0, item.discountPaise || 0)
  );

  // Taxable value
  const taxableValuePaise: Paise = Math.max(0, grossAmountPaise - effectiveDiscountPaise);

  // If Bill of Supply (Composition scheme or Exempt), no GST is collected
  if (documentType === 'BILL_OF_SUPPLY') {
    return {
      ...item,
      grossAmountPaise,
      effectiveDiscountPaise,
      taxableValuePaise,
      cgstRate: 0,
      cgstAmountPaise: 0,
      sgstRate: 0,
      sgstAmountPaise: 0,
      igstRate: 0,
      igstAmountPaise: 0,
      totalTaxPaise: 0,
      totalLineAmountPaise: taxableValuePaise,
    };
  }

  // Regular GST Calculations
  const rate = Math.max(0, item.gstRate);

  if (isInterState) {
    // Inter-State supply: IGST applies at the full rate
    const igstRate = rate;
    const igstAmountPaise: Paise = Math.round((taxableValuePaise * igstRate) / 100);

    return {
      ...item,
      grossAmountPaise,
      effectiveDiscountPaise,
      taxableValuePaise,
      cgstRate: 0,
      cgstAmountPaise: 0,
      sgstRate: 0,
      sgstAmountPaise: 0,
      igstRate,
      igstAmountPaise,
      totalTaxPaise: igstAmountPaise,
      totalLineAmountPaise: taxableValuePaise + igstAmountPaise,
    };
  } else {
    // Intra-State supply: 50% CGST + 50% SGST
    const cgstRate = rate / 2;
    const sgstRate = rate / 2;

    const cgstAmountPaise: Paise = Math.round((taxableValuePaise * cgstRate) / 100);
    const sgstAmountPaise: Paise = Math.round((taxableValuePaise * sgstRate) / 100);
    const totalTaxPaise = cgstAmountPaise + sgstAmountPaise;

    return {
      ...item,
      grossAmountPaise,
      effectiveDiscountPaise,
      taxableValuePaise,
      cgstRate,
      cgstAmountPaise,
      sgstRate,
      sgstAmountPaise,
      igstRate: 0,
      igstAmountPaise: 0,
      totalTaxPaise,
      totalLineAmountPaise: taxableValuePaise + totalTaxPaise,
    };
  }
}

/**
 * Calculates document-wide aggregates, taxes, round-off, and net totals.
 * Canonical implementation used across UI previews, API persistence, and PDF rendering.
 */
export function calculateDocument(
  input: DocumentCalculationInput
): DocumentCalculationOutput {
  const documentType = input.documentType || 'TAX_INVOICE';

  // Normalize state codes (2 digits) to determine intra-state vs inter-state
  const sCode = (input.supplierStateCode || '').trim();
  const posCode = (input.placeOfSupplyStateCode || '').trim();
  const isInterState = sCode !== '' && posCode !== '' && sCode !== posCode;

  // Calculate each line item
  const calculatedItems = input.items.map((item) =>
    calculateLineItem(item, isInterState, documentType)
  );

  // Sum line-level totals
  let subtotalGrossPaise: Paise = 0;
  let lineDiscountsPaise: Paise = 0;
  let totalTaxableAmountPaise: Paise = 0;
  let totalCgstPaise: Paise = 0;
  let totalSgstPaise: Paise = 0;
  let totalIgstPaise: Paise = 0;
  let totalTaxPaise: Paise = 0;

  for (const line of calculatedItems) {
    subtotalGrossPaise += line.grossAmountPaise;
    lineDiscountsPaise += line.effectiveDiscountPaise;
    totalTaxableAmountPaise += line.taxableValuePaise;
    totalCgstPaise += line.cgstAmountPaise;
    totalSgstPaise += line.sgstAmountPaise;
    totalIgstPaise += line.igstAmountPaise;
    totalTaxPaise += line.totalTaxPaise;
  }

  // Apply document-level discount if any
  const docDiscount = Math.min(
    totalTaxableAmountPaise,
    Math.max(0, input.documentDiscountPaise || 0)
  );
  const totalDiscountPaise = lineDiscountsPaise + docDiscount;

  // Unrounded raw total
  const rawTotalPaise: Paise = totalTaxableAmountPaise - docDiscount + totalTaxPaise;

  // Indian currency round-off to nearest whole rupee (multiple of 100 paise)
  const roundedRupees = Math.round(rawTotalPaise / 100);
  const netTotalPaise: Paise = roundedRupees * 100;
  const roundOffPaise: Paise = netTotalPaise - rawTotalPaise;

  return {
    isInterState,
    documentType,
    items: calculatedItems,
    subtotalGrossPaise,
    totalDiscountPaise,
    totalTaxableAmountPaise: totalTaxableAmountPaise - docDiscount,
    totalCgstPaise,
    totalSgstPaise,
    totalIgstPaise,
    totalTaxPaise,
    rawTotalPaise,
    roundOffPaise,
    netTotalPaise,
  };
}
