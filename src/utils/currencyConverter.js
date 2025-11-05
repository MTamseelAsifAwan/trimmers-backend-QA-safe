// src/utils/currencyConverter.js
class CurrencyConverter {
    constructor() {
       
        this.rates = {
            USD: 1.0,
            EUR: 0.85,
            GBP: 0.73,
            PKR: 275.5,
            JPY: 110.25,
        };
    }

    /**
     * Convert amount from one currency to another
     * @param {number} amount - Amount to convert
     * @param {string} fromCurrency - Source currency code
     * @param {string} toCurrency - Target currency code
     * @returns {number} - Converted amount
     */
    convert(amount, fromCurrency, toCurrency) {
        // If same currency, no conversion needed
        if (fromCurrency === toCurrency) {
            return amount;
        }

        // Check if currencies are supported
        if (!this.rates[fromCurrency] || !this.rates[toCurrency]) {
            throw new Error('Unsupported currency');
        }

        // Convert to USD first, then to target currency
        const amountInUSD = amount / this.rates[fromCurrency];
        return amountInUSD * this.rates[toCurrency];
    }

    /**
     * Format amount with currency symbol
     * @param {number} amount - Amount to format
     * @param {string} currency - Currency code
     * @returns {string} - Formatted amount with currency symbol
     */
    format(amount, currency) {
        const symbols = {
            USD: '$',
            EUR: '€',
            GBP: '£',
            PKR: '₨',
            JPY: '¥',
        };

        const symbol = symbols[currency] || currency;

        return `${symbol}${amount.toFixed(2)}`;
    }
}

module.exports = new CurrencyConverter();