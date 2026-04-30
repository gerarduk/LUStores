/**
 * Helper functions for formatting and handling decimal stock quantities
 */
/**
 * Format a stock quantity to 2 decimal places
 * @param value - The quantity value (string or number)
 * @returns Formatted string with 2 decimal places (e.g., "10.00", "10.50")
 */
export function formatStockQuantity(value) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num))
        return "0.00";
    return num.toFixed(2);
}
/**
 * Smart display formatting - only show decimals when needed
 * @param value - The quantity value (string or number)
 * @returns Formatted string (e.g., "10" for 10.00, "10.5" for 10.50)
 */
export function formatStockDisplay(value) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num))
        return "0";
    // Remove trailing zeros and unnecessary decimal point
    const formatted = num.toFixed(2);
    return formatted.replace(/\.?0+$/, '');
}
/**
 * Parse and validate a stock quantity input
 * @param value - The input value (string or number)
 * @returns Valid decimal quantity or null if invalid
 */
export function parseStockQuantity(value) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || num < 0)
        return null;
    // Round to 2 decimal places
    return Math.round(num * 100) / 100;
}
