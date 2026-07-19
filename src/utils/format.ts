/**
 * Formats a number in the Indian currency system (e.g. ₹1,25,000 or ₹740)
 */
export function formatIndianCurrency(amount: number, symbol: string = '₹'): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  // Format to 2 decimal places
  const fixedAmount = absAmount.toFixed(2);
  const [integerPart, decimalPart] = fixedAmount.split('.');
  
  // Indian currency formatting logic:
  // Last 3 digits are grouped, then every 2 digits are grouped
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  
  // Only show decimals if they are non-zero
  const finalDecimals = decimalPart !== '00' ? `.${decimalPart}` : '';
  
  return `${isNegative ? '-' : ''}${symbol}${formattedInteger}${finalDecimals}`;
}
