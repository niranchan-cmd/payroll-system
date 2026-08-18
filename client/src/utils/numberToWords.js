/**
 * Converts a number to Indian Currency Words format
 * e.g., 48200 -> "Rupees Forty-Eight Thousand Two Hundred Only"
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertLessThanThousand(n) {
  let word = '';
  if (n % 100 < 20) {
    word = ONES[n % 100];
    n = Math.floor(n / 100);
  } else {
    word = ONES[n % 10];
    n = Math.floor(n / 10);
    const tenWord = TENS[n % 10];
    word = tenWord ? (word ? `${tenWord}-${word}` : tenWord) : word;
    n = Math.floor(n / 10);
  }
  if (n === 0) return word;
  return `${ONES[n]} Hundred${word ? ` and ${word}` : ''}`;
}

export function numberToIndianWords(num) {
  const n = Math.round(Number(num) || 0);
  if (n === 0) return 'Rupees Zero Only';
  if (n < 0) return `Negative ${numberToIndianWords(Math.abs(n))}`;

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const remainder = n % 1000;

  let result = '';

  if (crore > 0) {
    result += `${convertLessThanThousand(crore)} Crore `;
  }
  if (lakh > 0) {
    result += `${convertLessThanThousand(lakh)} Lakh `;
  }
  if (thousand > 0) {
    result += `${convertLessThanThousand(thousand)} Thousand `;
  }
  if (remainder > 0) {
    result += `${convertLessThanThousand(remainder)} `;
  }

  return `Rupees ${result.trim()} Only`;
}
