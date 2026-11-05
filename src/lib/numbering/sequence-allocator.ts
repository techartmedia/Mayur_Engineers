/**
 * Financial year and document sequence numbering utilities.
 * Conforms to India GST financial year conventions (April 1 to March 31).
 */

/**
 * Returns the Indian financial year string for a given date.
 * If format is 'short' (default): returns '26-27' for FY 2026-27.
 * If format is 'full': returns '2026-27'.
 */
export function getFinancialYear(
  date: Date = new Date(),
  format: 'short' | 'full' = 'short'
): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed: 0 = Jan, 2 = Mar, 3 = Apr, 11 = Dec

  let startYear: number;
  let endYear: number;

  if (month >= 3) {
    // April to December: FY starts current year, ends next year
    startYear = year;
    endYear = year + 1;
  } else {
    // January to March: FY started previous year, ends current year
    startYear = year - 1;
    endYear = year;
  }

  const endShort = (endYear % 100).toString().padStart(2, '0');

  if (format === 'short') {
    const startShort = (startYear % 100).toString().padStart(2, '0');
    return `${startShort}-${endShort}`;
  }

  return `${startYear}-${endShort}`;
}

/**
 * Formats an invoice number using the standardized pattern:
 * [Prefix]/[FinancialYear]/[Sequence]
 * e.g., formatInvoiceNumber('ME', '26-27', 1, 3) => "ME/26-27/001"
 */
export function formatInvoiceNumber(
  prefix: string,
  financialYear: string,
  sequence: number,
  padding: number = 3
): string {
  const cleanPrefix = (prefix || 'ME').trim().toUpperCase();
  const cleanFY = (financialYear || getFinancialYear()).trim();
  const paddedSeq = sequence.toString().padStart(padding, '0');

  return `${cleanPrefix}/${cleanFY}/${paddedSeq}`;
}

/**
 * Parses a formatted invoice number into its components.
 * e.g., "ME/26-27/001" => { prefix: "ME", financialYear: "26-27", sequence: 1 }
 */
export function parseInvoiceNumber(
  invoiceNumber: string
): { prefix: string; financialYear: string; sequence: number } | null {
  if (!invoiceNumber) return null;
  const parts = invoiceNumber.trim().split('/');
  if (parts.length !== 3) return null;

  const prefix = parts[0];
  const financialYear = parts[1];
  const sequence = parseInt(parts[2], 10);

  if (isNaN(sequence)) return null;

  return { prefix, financialYear, sequence };
}
