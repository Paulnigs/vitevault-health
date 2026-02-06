/**
 * Simulated card validation for demo mode
 * In production, this would be replaced with actual payment processor
 */

interface CardDetails {
    number: string;
    expiry: string;
    cvv: string;
    name?: string;
}

interface ValidationResult {
    valid: boolean;
    error?: string;
    cardType?: 'visa' | 'mastercard' | 'verve' | 'unknown';
}

/**
 * Mock Luhn algorithm check
 * For demo: Cards starting with '4' are Visa, '5' are Mastercard, '5061' are Verve
 */
function getMockCardType(number: string): 'visa' | 'mastercard' | 'verve' | 'unknown' {
    const cleaned = number.replace(/\s/g, '');

    if (cleaned.startsWith('4')) return 'visa';
    if (cleaned.startsWith('5061') || cleaned.startsWith('6500')) return 'verve';
    if (cleaned.startsWith('5')) return 'mastercard';

    return 'unknown';
}

/**
 * Simplified Luhn algorithm check (for demo simulation)
 */
function passesLuhnCheck(number: string): boolean {
    const cleaned = number.replace(/\s/g, '');

    // For demo: Accept any 16-digit number starting with valid prefix
    if (cleaned.length !== 16) return false;
    if (!/^\d+$/.test(cleaned)) return false;

    // Accept cards starting with 4, 5, or 6
    const firstDigit = cleaned[0];
    return ['4', '5', '6'].includes(firstDigit);
}

/**
 * Validate expiry date (MM/YY format)
 */
function validateExpiry(expiry: string): boolean {
    const match = expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!match) return false;

    const month = parseInt(match[1], 10);
    const year = parseInt(match[2], 10) + 2000;

    if (month < 1 || month > 12) return false;

    const now = new Date();
    const expiryDate = new Date(year, month); // First day of next month

    return expiryDate > now;
}

/**
 * Validate CVV (3-4 digits)
 */
function validateCVV(cvv: string): boolean {
    return /^\d{3,4}$/.test(cvv);
}

/**
 * Main validation function for fake card details
 */
export function validateCard(card: CardDetails): ValidationResult {
    // Check card number
    if (!card.number || card.number.replace(/\s/g, '').length !== 16) {
        return { valid: false, error: 'Card number must be 16 digits' };
    }

    if (!passesLuhnCheck(card.number)) {
        return { valid: false, error: 'Invalid card number for demo. Use a number starting with 4, 5, or 6' };
    }

    // Check expiry
    if (!card.expiry || !validateExpiry(card.expiry)) {
        return { valid: false, error: 'Invalid or expired card. Use format MM/YY with a future date' };
    }

    // Check CVV
    if (!card.cvv || !validateCVV(card.cvv)) {
        return { valid: false, error: 'CVV must be 3-4 digits' };
    }

    const cardType = getMockCardType(card.number);

    // For demo mode: Simulate random failures (10% chance)
    const shouldFail = Math.random() < 0.1;
    if (shouldFail) {
        return { valid: false, error: 'Transaction declined. Please try again (demo simulation)' };
    }

    return { valid: true, cardType };
}

/**
 * Format card number with spaces
 */
export function formatCardNumber(number: string): string {
    const cleaned = number.replace(/\D/g, '');
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(' ');
}

/**
 * Mask card number for display
 */
export function maskCardNumber(number: string): string {
    const cleaned = number.replace(/\s/g, '');
    if (cleaned.length < 4) return number;
    return `**** **** **** ${cleaned.slice(-4)}`;
}

/**
 * Generate demo card numbers for testing
 */
export const DEMO_CARDS = {
    visa: '4111 1111 1111 1111',
    mastercard: '5500 0000 0000 0004',
    verve: '5061 0000 0000 0000',
};
