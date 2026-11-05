import { Paise } from './types';

/**
 * Converts a rupee value (number or string representation) into integer paise.
 * Safely eliminates floating-point drift:
 * e.g. 19.99 -> 1999 paise.
 */
export function toPaise(rupees: number | string): Paise {
  if (typeof rupees === 'string') {
    const cleaned = rupees.replace(/,/g, '').trim();
    if (!cleaned || isNaN(Number(cleaned))) return 0;
    const parts = cleaned.split('.');
    const whole = parseInt(parts[0], 10) || 0;
    const fraction = parts[1] ? parts[1].padEnd(2, '0').slice(0, 2) : '00';
    const isNegative = cleaned.startsWith('-');
    const totalPaise = Math.abs(whole) * 100 + parseInt(fraction, 10);
    return isNegative ? -totalPaise : totalPaise;
  }

  if (isNaN(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Converts integer paise into a standard decimal rupee number.
 * e.g. 1999 -> 19.99
 */
export function toRupees(paise: Paise): number {
  return paise / 100;
}

/**
 * Formats integer paise into Indian currency format (e.g. ₹1,23,456.78).
 * Follows the Indian numbering system: 2,2,3 grouping.
 */
export function formatINR(
  paise: Paise,
  options: { showSymbol?: boolean; showPaise?: boolean } = {}
): string {
  const { showSymbol = true, showPaise = true } = options;
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);

  const wholeRupees = Math.floor(absPaise / 100);
  const paiseRemainder = absPaise % 100;

  // Indian numbering system grouping
  const s = wholeRupees.toString();
  let lastThree = s.substring(s.length - 3);
  const otherNumbers = s.substring(0, s.length - 3);
  let formattedWhole = lastThree;

  if (otherNumbers !== '') {
    formattedWhole = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  let result = formattedWhole;
  if (showPaise) {
    result += '.' + paiseRemainder.toString().padStart(2, '0');
  }

  const prefix = isNegative ? (showSymbol ? '-₹' : '-') : (showSymbol ? '₹' : '');
  return prefix + result;
}

/**
 * Converts integer paise into Indian English words for GST invoice total display.
 * e.g. 125050 -> "Rupees One Thousand Two Hundred Fifty and Fifty Paise Only"
 */
export function numberToWordsIndian(paise: Paise): string {
  if (paise === 0) return 'Rupees Zero Only';

  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertTwoDigits(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred > 0) {
      res += ones[hundred] + ' Hundred';
      if (rest > 0) res += ' ';
    }
    if (rest > 0) {
      res += convertTwoDigits(rest);
    }
    return res;
  }

  let words = '';
  const crore = Math.floor(rupees / 10000000);
  let rem = rupees % 10000000;

  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;

  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;

  if (crore > 0) {
    words += convertTwoDigits(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertTwoDigits(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertTwoDigits(thousand) + ' Thousand ';
  }
  if (rem > 0) {
    words += convertThreeDigits(rem) + ' ';
  }

  words = words.trim();
  let result = 'Rupees ' + (words || 'Zero');

  if (remainderPaise > 0) {
    result += ' and ' + convertTwoDigits(remainderPaise) + ' Paise';
  }

  result += ' Only';

  return isNegative ? 'Minus ' + result : result;
}

/**
 * Returns Indian amount in words without "Rupees " prefix.
 * e.g., 11800 => "One Hundred Eighteen Only"
 */
export function formatINRWords(paise: Paise): string {
  const full = numberToWordsIndian(paise);
  if (full.startsWith('Rupees ')) {
    return full.replace(/^Rupees\s+/, '');
  }
  return full;
}
