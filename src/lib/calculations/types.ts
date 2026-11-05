/**
 * Types for the canonical financial and GST calculation engine.
 * All monetary amounts are represented as integer paise (1 INR = 100 paise).
 */

export type Paise = number;

export interface LineItemInput {
  id?: string;
  description: string;
  hsnSacCode?: string;
  unit?: string;
  quantity: number;
  unitPricePaise: Paise;
  /** Line-level discount amount in paise */
  discountPaise?: Paise;
  /** GST rate percentage (e.g. 0, 5, 12, 18, 28) */
  gstRate: number;
}

export interface LineItemCalculated extends LineItemInput {
  /** Gross line total before discount: round(quantity * unitPricePaise) */
  grossAmountPaise: Paise;
  /** Effective discount applied in paise */
  effectiveDiscountPaise: Paise;
  /** Taxable value: grossAmountPaise - effectiveDiscountPaise */
  taxableValuePaise: Paise;
  /** Applicable CGST rate (0 if inter-state or exempt) */
  cgstRate: number;
  /** CGST amount in paise */
  cgstAmountPaise: Paise;
  /** Applicable SGST rate (0 if inter-state or exempt) */
  sgstRate: number;
  /** SGST amount in paise */
  sgstAmountPaise: Paise;
  /** Applicable IGST rate (0 if intra-state or exempt) */
  igstRate: number;
  /** IGST amount in paise */
  igstAmountPaise: Paise;
  /** Total tax amount for this line */
  totalTaxPaise: Paise;
  /** Total line amount including tax */
  totalLineAmountPaise: Paise;
}

export interface DocumentCalculationInput {
  items: LineItemInput[];
  /** 2-digit supplier GST state code (e.g. "27" for Maharashtra) */
  supplierStateCode: string;
  /** 2-digit recipient / place of supply state code */
  placeOfSupplyStateCode: string;
  /** Document type: 'TAX_INVOICE' | 'BILL_OF_SUPPLY' */
  documentType?: 'TAX_INVOICE' | 'BILL_OF_SUPPLY';
  /** Additional document-level discount in paise */
  documentDiscountPaise?: Paise;
}

export interface DocumentCalculationOutput {
  isInterState: boolean;
  documentType: 'TAX_INVOICE' | 'BILL_OF_SUPPLY';
  items: LineItemCalculated[];
  /** Sum of gross amounts of all lines in paise */
  subtotalGrossPaise: Paise;
  /** Total discounts applied (line + document level) in paise */
  totalDiscountPaise: Paise;
  /** Total taxable base in paise */
  totalTaxableAmountPaise: Paise;
  /** Total CGST in paise */
  totalCgstPaise: Paise;
  /** Total SGST in paise */
  totalSgstPaise: Paise;
  /** Total IGST in paise */
  totalIgstPaise: Paise;
  /** Total tax across all categories in paise */
  totalTaxPaise: Paise;
  /** Raw unrounded total in paise (taxable + tax) */
  rawTotalPaise: Paise;
  /** Round-off adjustment in paise (between -50 and +49 paise) */
  roundOffPaise: Paise;
  /** Net invoice total in paise rounded to the nearest integer rupee */
  netTotalPaise: Paise;
}
