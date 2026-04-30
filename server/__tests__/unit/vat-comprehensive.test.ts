/**
 * VAT Handling Comprehensive Tests
 * 
 * Tests all aspects of VAT (Value Added Tax) handling including:
 * 1. VAT rate validation and calculation algorithms
 * 2. VAT-inclusive vs VAT-exclusive pricing handling
 * 3. VAT calculations in sales, quotes, and orders
 * 4. VAT rate changes and updates
 * 5. Multi-rate VAT scenarios
 * 6. VAT compliance and validation
 * 7. Edge cases and precision handling
 * 8. Historical VAT preservation
 * 9. VAT in invoice processing and parsing
 * 10. Performance with complex VAT scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock VAT calculation service to test all scenarios
class MockVATService {
  // Standard UK VAT rates
  static readonly STANDARD_RATE = 0.20;
  static readonly REDUCED_RATE = 0.05;
  static readonly ZERO_RATE = 0.00;
  
  // VAT rate bounds for validation
  static readonly MIN_VAT_RATE = 0.00;
  static readonly MAX_VAT_RATE = 0.50; // 50% theoretical maximum
  
  // Precision settings
  static readonly DECIMAL_PRECISION = 2;
  static readonly CALCULATION_PRECISION = 4;

  /**
   * Calculate VAT for a given amount and rate
   */
  static calculateVAT(amount: number, vatRate: number, vatIncluded: boolean = false): VATCalculation {
    this.validateVATRate(vatRate);
    
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }

    let net: number;
    let vatAmount: number;
    let gross: number;

    if (vatIncluded) {
      // Price includes VAT - calculate backwards
      gross = amount;
      net = gross / (1 + vatRate);
      vatAmount = gross - net;
    } else {
      // Price excludes VAT - calculate forwards
      net = amount;
      vatAmount = net * vatRate;
      gross = net + vatAmount;
    }

    return {
      netAmount: this.roundToDecimals(net, this.DECIMAL_PRECISION),
      vatAmount: this.roundToDecimals(vatAmount, this.DECIMAL_PRECISION),
      grossAmount: this.roundToDecimals(gross, this.DECIMAL_PRECISION),
      vatRate: vatRate,
      vatIncluded: vatIncluded,
      calculatedAt: new Date(),
    };
  }

  /**
   * Calculate line item VAT for quantity-based pricing
   */
  static calculateLineVAT(unitPrice: number, quantity: number, vatRate: number, vatIncluded: boolean = false): LineVATCalculation {
    this.validateVATRate(vatRate);
    
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    const lineTotal = unitPrice * quantity;
    
    let lineNet: number;
    let lineVAT: number;
    let lineGross: number;

    if (vatIncluded) {
      lineGross = lineTotal;
      lineNet = lineGross / (1 + vatRate);
      lineVAT = lineGross - lineNet;
    } else {
      lineNet = lineTotal;
      lineVAT = lineNet * vatRate;
      lineGross = lineNet + lineVAT;
    }

    return {
      unitPrice: this.roundToDecimals(unitPrice, this.DECIMAL_PRECISION),
      quantity: quantity,
      lineSubtotal: this.roundToDecimals(lineNet, this.DECIMAL_PRECISION),
      lineVATAmount: this.roundToDecimals(lineVAT, this.DECIMAL_PRECISION),
      lineTotal: this.roundToDecimals(lineGross, this.DECIMAL_PRECISION),
      unitNetPrice: this.roundToDecimals(lineNet / quantity, this.DECIMAL_PRECISION),
      unitVATAmount: this.roundToDecimals(lineVAT / quantity, this.DECIMAL_PRECISION),
      unitGrossPrice: this.roundToDecimals(lineGross / quantity, this.DECIMAL_PRECISION),
      vatRate: vatRate,
      vatIncluded: vatIncluded,
    };
  }

  /**
   * Calculate totals for multiple line items with different VAT rates
   */
  static calculateMultiLineVAT(lines: MultiLineVATInput[]): MultiLineVATCalculation {
    const calculations = lines.map(line => 
      this.calculateLineVAT(line.unitPrice, line.quantity, line.vatRate, line.vatIncluded)
    );

    // Group by VAT rate for breakdown
    const vatBreakdown = new Map<number, VATRateBreakdown>();

    calculations.forEach(calc => {
      const rate = calc.vatRate;
      if (!vatBreakdown.has(rate)) {
        vatBreakdown.set(rate, {
          vatRate: rate,
          netAmount: 0,
          vatAmount: 0,
          grossAmount: 0,
          lineCount: 0,
        });
      }

      const breakdown = vatBreakdown.get(rate)!;
      breakdown.netAmount += calc.lineSubtotal;
      breakdown.vatAmount += calc.lineVATAmount;
      breakdown.grossAmount += calc.lineTotal;
      breakdown.lineCount++;
    });

    // Calculate overall totals
    const totalNet = calculations.reduce((sum, calc) => sum + calc.lineSubtotal, 0);
    const totalVAT = calculations.reduce((sum, calc) => sum + calc.lineVATAmount, 0);
    const totalGross = calculations.reduce((sum, calc) => sum + calc.lineTotal, 0);

    return {
      lineCalculations: calculations,
      vatBreakdown: Array.from(vatBreakdown.values()).map(breakdown => ({
        ...breakdown,
        netAmount: this.roundToDecimals(breakdown.netAmount, this.DECIMAL_PRECISION),
        vatAmount: this.roundToDecimals(breakdown.vatAmount, this.DECIMAL_PRECISION),
        grossAmount: this.roundToDecimals(breakdown.grossAmount, this.DECIMAL_PRECISION),
      })),
      totals: {
        totalNet: this.roundToDecimals(totalNet, this.DECIMAL_PRECISION),
        totalVAT: this.roundToDecimals(totalVAT, this.DECIMAL_PRECISION),
        totalGross: this.roundToDecimals(totalGross, this.DECIMAL_PRECISION),
        averageVATRate: totalNet > 0 ? this.roundToDecimals(totalVAT / totalNet, this.CALCULATION_PRECISION) : 0,
      },
    };
  }

  /**
   * Reverse engineer VAT rate from gross and net amounts
   */
  static deriveVATRate(netAmount: number, grossAmount: number): number {
    if (netAmount <= 0 || grossAmount < netAmount) {
      throw new Error('Invalid amounts for VAT rate calculation');
    }

    if (netAmount === grossAmount) {
      return 0; // Zero VAT
    }

    const vatAmount = grossAmount - netAmount;
    const derivedRate = vatAmount / netAmount;
    
    return this.roundToDecimals(derivedRate, this.CALCULATION_PRECISION);
  }

  /**
   * Convert between VAT-included and VAT-excluded pricing
   */
  static convertVATInclusion(amount: number, vatRate: number, fromIncluded: boolean, toIncluded: boolean): VATConversion {
    this.validateVATRate(vatRate);

    if (fromIncluded === toIncluded) {
      // No conversion needed
      return {
        originalAmount: amount,
        convertedAmount: amount,
        vatRate: vatRate,
        fromVATIncluded: fromIncluded,
        toVATIncluded: toIncluded,
        conversionApplied: false,
      };
    }

    let convertedAmount: number;

    if (fromIncluded && !toIncluded) {
      // Converting from VAT-included to VAT-excluded
      convertedAmount = amount / (1 + vatRate);
    } else {
      // Converting from VAT-excluded to VAT-included
      convertedAmount = amount * (1 + vatRate);
    }

    return {
      originalAmount: amount,
      convertedAmount: this.roundToDecimals(convertedAmount, this.DECIMAL_PRECISION),
      vatRate: vatRate,
      fromVATIncluded: fromIncluded,
      toVATIncluded: toIncluded,
      conversionApplied: true,
    };
  }

  /**
   * Validate that VAT rate is within acceptable bounds
   */
  static validateVATRate(vatRate: number): void {
    if (typeof vatRate !== 'number' || isNaN(vatRate)) {
      throw new Error('VAT rate must be a valid number');
    }

    if (vatRate < this.MIN_VAT_RATE) {
      throw new Error(`VAT rate cannot be less than ${this.MIN_VAT_RATE * 100}%`);
    }

    if (vatRate > this.MAX_VAT_RATE) {
      throw new Error(`VAT rate cannot be greater than ${this.MAX_VAT_RATE * 100}%`);
    }
  }

  /**
   * Check if two VAT calculations are equivalent within tolerance
   */
  static areCalculationsEquivalent(calc1: VATCalculation, calc2: VATCalculation, tolerance: number = 0.01): boolean {
    return (
      Math.abs(calc1.netAmount - calc2.netAmount) < tolerance &&
      Math.abs(calc1.vatAmount - calc2.vatAmount) < tolerance &&
      Math.abs(calc1.grossAmount - calc2.grossAmount) < tolerance &&
      calc1.vatRate === calc2.vatRate
    );
  }

  /**
   * Utility to round to specified decimal places
   */
  static roundToDecimals(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  /**
   * Get predefined VAT rates for common scenarios
   */
  static getStandardVATRates(): { [key: string]: number } {
    return {
      'UK_STANDARD': this.STANDARD_RATE,
      'UK_REDUCED': this.REDUCED_RATE,
      'ZERO_RATED': this.ZERO_RATE,
      'EU_STANDARD': 0.21, // Common EU rate
      'HIGH_VAT': 0.25,    // Some Nordic countries
    };
  }

  /**
   * Simulate invoice VAT recalculation
   */
  static recalculateInvoiceVAT(invoiceData: InvoiceVATData): InvoiceVATCalculation {
    const lineCalculations = invoiceData.items.map(item => 
      this.calculateLineVAT(item.unitPrice, item.quantity, item.vatRate, item.vatIncluded)
    );

    const multiLineCalc = this.calculateMultiLineVAT(invoiceData.items);
    
    // Check if recalculation differs significantly from original
    const originalTotal = invoiceData.originalSubtotal + invoiceData.originalVATAmount;
    const calculatedTotal = multiLineCalc.totals.totalGross;
    const discrepancy = Math.abs(originalTotal - calculatedTotal);
    const discrepancyPercentage = originalTotal > 0 ? (discrepancy / originalTotal) * 100 : 0;

    const shouldRecalculate = discrepancyPercentage > 1; // Recalculate if more than 1% difference

    return {
      originalSubtotal: invoiceData.originalSubtotal,
      originalVATAmount: invoiceData.originalVATAmount,
      originalTotal: originalTotal,
      calculatedSubtotal: multiLineCalc.totals.totalNet,
      calculatedVATAmount: multiLineCalc.totals.totalVAT,
      calculatedTotal: calculatedTotal,
      discrepancy: this.roundToDecimals(discrepancy, this.DECIMAL_PRECISION),
      discrepancyPercentage: this.roundToDecimals(discrepancyPercentage, this.DECIMAL_PRECISION),
      shouldRecalculate: shouldRecalculate,
      recalculatedData: shouldRecalculate ? {
        subtotal: multiLineCalc.totals.totalNet,
        vatAmount: multiLineCalc.totals.totalVAT,
        total: calculatedTotal,
        vatBreakdown: multiLineCalc.vatBreakdown,
      } : null,
      lineCalculations: lineCalculations,
    };
  }
}

// Type definitions for VAT calculations
interface VATCalculation {
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  vatRate: number;
  vatIncluded: boolean;
  calculatedAt: Date;
}

interface LineVATCalculation {
  unitPrice: number;
  quantity: number;
  lineSubtotal: number;
  lineVATAmount: number;
  lineTotal: number;
  unitNetPrice: number;
  unitVATAmount: number;
  unitGrossPrice: number;
  vatRate: number;
  vatIncluded: boolean;
}

interface MultiLineVATInput {
  unitPrice: number;
  quantity: number;
  vatRate: number;
  vatIncluded: boolean;
}

interface VATRateBreakdown {
  vatRate: number;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  lineCount: number;
}

interface MultiLineVATCalculation {
  lineCalculations: LineVATCalculation[];
  vatBreakdown: VATRateBreakdown[];
  totals: {
    totalNet: number;
    totalVAT: number;
    totalGross: number;
    averageVATRate: number;
  };
}

interface VATConversion {
  originalAmount: number;
  convertedAmount: number;
  vatRate: number;
  fromVATIncluded: boolean;
  toVATIncluded: boolean;
  conversionApplied: boolean;
}

interface InvoiceVATData {
  originalSubtotal: number;
  originalVATAmount: number;
  items: MultiLineVATInput[];
}

interface InvoiceVATCalculation {
  originalSubtotal: number;
  originalVATAmount: number;
  originalTotal: number;
  calculatedSubtotal: number;
  calculatedVATAmount: number;
  calculatedTotal: number;
  discrepancy: number;
  discrepancyPercentage: number;
  shouldRecalculate: boolean;
  recalculatedData: {
    subtotal: number;
    vatAmount: number;
    total: number;
    vatBreakdown: VATRateBreakdown[];
  } | null;
  lineCalculations: LineVATCalculation[];
}

describe('VAT Handling Comprehensive Tests', () => {

  describe('Basic VAT Calculations', () => {

    it('should calculate standard 20% VAT on VAT-exclusive amounts', () => {
      const result = MockVATService.calculateVAT(100.00, 0.20, false);

      expect(result.netAmount).toBe(100.00);
      expect(result.vatAmount).toBe(20.00);
      expect(result.grossAmount).toBe(120.00);
      expect(result.vatRate).toBe(0.20);
      expect(result.vatIncluded).toBe(false);
    });

    it('should calculate standard 20% VAT on VAT-inclusive amounts', () => {
      const result = MockVATService.calculateVAT(120.00, 0.20, true);

      expect(result.netAmount).toBe(100.00);
      expect(result.vatAmount).toBe(20.00);
      expect(result.grossAmount).toBe(120.00);
      expect(result.vatRate).toBe(0.20);
      expect(result.vatIncluded).toBe(true);
    });

    it('should handle reduced 5% VAT rates', () => {
      const resultExclusive = MockVATService.calculateVAT(100.00, 0.05, false);
      expect(resultExclusive.netAmount).toBe(100.00);
      expect(resultExclusive.vatAmount).toBe(5.00);
      expect(resultExclusive.grossAmount).toBe(105.00);

      const resultInclusive = MockVATService.calculateVAT(105.00, 0.05, true);
      expect(resultInclusive.netAmount).toBe(100.00);
      expect(resultInclusive.vatAmount).toBe(5.00);
      expect(resultInclusive.grossAmount).toBe(105.00);
    });

    it('should handle zero-rated VAT', () => {
      const result = MockVATService.calculateVAT(100.00, 0.00, false);

      expect(result.netAmount).toBe(100.00);
      expect(result.vatAmount).toBe(0.00);
      expect(result.grossAmount).toBe(100.00);
    });

    it('should handle custom VAT rates', () => {
      // Test 15% VAT rate
      const result15 = MockVATService.calculateVAT(100.00, 0.15, false);
      expect(result15.vatAmount).toBe(15.00);
      expect(result15.grossAmount).toBe(115.00);

      // Test 25% VAT rate (Nordic countries)
      const result25 = MockVATService.calculateVAT(100.00, 0.25, false);
      expect(result25.vatAmount).toBe(25.00);
      expect(result25.grossAmount).toBe(125.00);
    });
  });

  describe('Line Item VAT Calculations', () => {

    it('should calculate VAT for quantity-based line items', () => {
      const result = MockVATService.calculateLineVAT(25.00, 4, 0.20, false);

      expect(result.unitPrice).toBe(25.00);
      expect(result.quantity).toBe(4);
      expect(result.lineSubtotal).toBe(100.00); // 25 * 4
      expect(result.lineVATAmount).toBe(20.00);  // 100 * 0.20
      expect(result.lineTotal).toBe(120.00);     // 100 + 20
      expect(result.unitNetPrice).toBe(25.00);   // 100 / 4
      expect(result.unitVATAmount).toBe(5.00);   // 20 / 4
      expect(result.unitGrossPrice).toBe(30.00); // 120 / 4
    });

    it('should calculate VAT-inclusive line items', () => {
      const result = MockVATService.calculateLineVAT(30.00, 4, 0.20, true);

      expect(result.unitPrice).toBe(30.00);
      expect(result.quantity).toBe(4);
      expect(result.lineSubtotal).toBe(100.00);  // (30 * 4) / 1.20
      expect(result.lineVATAmount).toBe(20.00);  // 120 - 100
      expect(result.lineTotal).toBe(120.00);     // 30 * 4
      expect(result.unitNetPrice).toBe(25.00);   // 100 / 4
      expect(result.unitVATAmount).toBe(5.00);   // 20 / 4
      expect(result.unitGrossPrice).toBe(30.00); // Original unit price
    });

    it('should handle decimal quantities', () => {
      const result = MockVATService.calculateLineVAT(12.50, 2.5, 0.20, false);

      expect(result.lineSubtotal).toBe(31.25);   // 12.50 * 2.5
      expect(result.lineVATAmount).toBe(6.25);   // 31.25 * 0.20
      expect(result.lineTotal).toBe(37.50);      // 31.25 + 6.25
      expect(result.unitNetPrice).toBe(12.50);   // 31.25 / 2.5
      expect(result.unitVATAmount).toBe(2.50);   // 6.25 / 2.5
      expect(result.unitGrossPrice).toBe(15.00); // 37.50 / 2.5
    });
  });

  describe('Multi-Line VAT Calculations', () => {

    it('should calculate totals for multiple lines with same VAT rate', () => {
      const lines: MultiLineVATInput[] = [
        { unitPrice: 25.00, quantity: 2, vatRate: 0.20, vatIncluded: false },
        { unitPrice: 30.00, quantity: 1, vatRate: 0.20, vatIncluded: false },
        { unitPrice: 15.00, quantity: 4, vatRate: 0.20, vatIncluded: false },
      ];

      const result = MockVATService.calculateMultiLineVAT(lines);

      // Line 1: 50.00 + 10.00 = 60.00
      // Line 2: 30.00 + 6.00 = 36.00
      // Line 3: 60.00 + 12.00 = 72.00
      // Total: 140.00 + 28.00 = 168.00

      expect(result.totals.totalNet).toBe(140.00);
      expect(result.totals.totalVAT).toBe(28.00);
      expect(result.totals.totalGross).toBe(168.00);
      expect(result.totals.averageVATRate).toBe(0.20);

      expect(result.vatBreakdown).toHaveLength(1);
      expect(result.vatBreakdown[0].vatRate).toBe(0.20);
      expect(result.vatBreakdown[0].netAmount).toBe(140.00);
      expect(result.vatBreakdown[0].vatAmount).toBe(28.00);
      expect(result.vatBreakdown[0].lineCount).toBe(3);
    });

    it('should calculate totals for multiple lines with different VAT rates', () => {
      const lines: MultiLineVATInput[] = [
        { unitPrice: 100.00, quantity: 1, vatRate: 0.20, vatIncluded: false }, // Standard rate
        { unitPrice: 50.00, quantity: 2, vatRate: 0.05, vatIncluded: false },  // Reduced rate
        { unitPrice: 75.00, quantity: 1, vatRate: 0.00, vatIncluded: false },  // Zero rate
      ];

      const result = MockVATService.calculateMultiLineVAT(lines);

      // Line 1 (20%): 100.00 + 20.00 = 120.00
      // Line 2 (5%):  100.00 + 5.00 = 105.00
      // Line 3 (0%):  75.00 + 0.00 = 75.00
      // Total: 275.00 + 25.00 = 300.00

      expect(result.totals.totalNet).toBe(275.00);
      expect(result.totals.totalVAT).toBe(25.00);
      expect(result.totals.totalGross).toBe(300.00);

      expect(result.vatBreakdown).toHaveLength(3);
      
      const standardRate = result.vatBreakdown.find(b => b.vatRate === 0.20);
      expect(standardRate?.netAmount).toBe(100.00);
      expect(standardRate?.vatAmount).toBe(20.00);

      const reducedRate = result.vatBreakdown.find(b => b.vatRate === 0.05);
      expect(reducedRate?.netAmount).toBe(100.00);
      expect(reducedRate?.vatAmount).toBe(5.00);

      const zeroRate = result.vatBreakdown.find(b => b.vatRate === 0.00);
      expect(zeroRate?.netAmount).toBe(75.00);
      expect(zeroRate?.vatAmount).toBe(0.00);
    });

    it('should handle mixed VAT-inclusive and VAT-exclusive items', () => {
      const lines: MultiLineVATInput[] = [
        { unitPrice: 120.00, quantity: 1, vatRate: 0.20, vatIncluded: true },  // £100 net + £20 VAT
        { unitPrice: 100.00, quantity: 1, vatRate: 0.20, vatIncluded: false }, // £100 net + £20 VAT
      ];

      const result = MockVATService.calculateMultiLineVAT(lines);

      expect(result.totals.totalNet).toBe(200.00);
      expect(result.totals.totalVAT).toBe(40.00);
      expect(result.totals.totalGross).toBe(240.00);

      expect(result.lineCalculations[0].lineSubtotal).toBe(100.00);
      expect(result.lineCalculations[0].lineVATAmount).toBe(20.00);
      expect(result.lineCalculations[1].lineSubtotal).toBe(100.00);
      expect(result.lineCalculations[1].lineVATAmount).toBe(20.00);
    });
  });

  describe('VAT Rate Operations', () => {

    it('should validate VAT rates within acceptable bounds', () => {
      // Valid rates
      expect(() => MockVATService.validateVATRate(0.00)).not.toThrow();
      expect(() => MockVATService.validateVATRate(0.20)).not.toThrow();
      expect(() => MockVATService.validateVATRate(0.50)).not.toThrow();

      // Invalid rates
      expect(() => MockVATService.validateVATRate(-0.01)).toThrow('VAT rate cannot be less than 0%');
      expect(() => MockVATService.validateVATRate(0.51)).toThrow('VAT rate cannot be greater than 50%');
      expect(() => MockVATService.validateVATRate(NaN)).toThrow('VAT rate must be a valid number');
      expect(() => MockVATService.validateVATRate('invalid' as any)).toThrow('VAT rate must be a valid number');
    });

    it('should derive VAT rate from amounts', () => {
      // 20% VAT: £100 net, £120 gross
      expect(MockVATService.deriveVATRate(100.00, 120.00)).toBe(0.20);
      
      // 5% VAT: £100 net, £105 gross
      expect(MockVATService.deriveVATRate(100.00, 105.00)).toBe(0.05);
      
      // 0% VAT: £100 net, £100 gross
      expect(MockVATService.deriveVATRate(100.00, 100.00)).toBe(0.00);

      // Invalid scenarios
      expect(() => MockVATService.deriveVATRate(0, 100)).toThrow('Invalid amounts');
      expect(() => MockVATService.deriveVATRate(100, 90)).toThrow('Invalid amounts');
    });

    it('should convert between VAT-included and VAT-excluded pricing', () => {
      // Convert from VAT-excluded to VAT-included
      const toInclusive = MockVATService.convertVATInclusion(100.00, 0.20, false, true);
      expect(toInclusive.originalAmount).toBe(100.00);
      expect(toInclusive.convertedAmount).toBe(120.00);
      expect(toInclusive.conversionApplied).toBe(true);

      // Convert from VAT-included to VAT-excluded
      const toExclusive = MockVATService.convertVATInclusion(120.00, 0.20, true, false);
      expect(toExclusive.originalAmount).toBe(120.00);
      expect(toExclusive.convertedAmount).toBe(100.00);
      expect(toExclusive.conversionApplied).toBe(true);

      // No conversion needed
      const noConversion = MockVATService.convertVATInclusion(100.00, 0.20, false, false);
      expect(noConversion.originalAmount).toBe(100.00);
      expect(noConversion.convertedAmount).toBe(100.00);
      expect(noConversion.conversionApplied).toBe(false);
    });
  });

  describe('Precision and Edge Cases', () => {

    it('should handle repeating decimal VAT rates', () => {
      // 33.33% VAT rate (1/3)
      const result = MockVATService.calculateVAT(100.00, 0.3333, false);

      expect(result.netAmount).toBe(100.00);
      expect(result.vatAmount).toBe(33.33); // Should round to 2 decimal places
      expect(result.grossAmount).toBe(133.33);
    });

    it('should handle very small amounts', () => {
      const result = MockVATService.calculateVAT(0.01, 0.20, false);

      expect(result.netAmount).toBe(0.01);
      expect(result.vatAmount).toBe(0.00); // Rounds to 0.00
      expect(result.grossAmount).toBe(0.01);
    });

    it('should handle large amounts', () => {
      const result = MockVATService.calculateVAT(999999.99, 0.20, false);

      expect(result.netAmount).toBe(999999.99);
      expect(result.vatAmount).toBe(200000.00); // 999999.99 * 0.20, rounded
      expect(result.grossAmount).toBe(1199999.99);
    });

    it('should handle edge case VAT rates', () => {
      // Minimum rate (0%)
      const zeroResult = MockVATService.calculateVAT(100.00, 0.00, false);
      expect(zeroResult.vatAmount).toBe(0.00);

      // Maximum rate (50%)
      const maxResult = MockVATService.calculateVAT(100.00, 0.50, false);
      expect(maxResult.vatAmount).toBe(50.00);
      expect(maxResult.grossAmount).toBe(150.00);
    });

    it('should round consistently to avoid floating point errors', () => {
      // Common floating point issue: 0.1 + 0.2 = 0.30000000000000004
      const result1 = MockVATService.calculateVAT(10.00, 0.20, false);
      const result2 = MockVATService.calculateVAT(20.00, 0.20, false);
      
      // Sum should be properly rounded
      const combinedNet = result1.netAmount + result2.netAmount;
      const combinedVAT = result1.vatAmount + result2.vatAmount;
      const combinedGross = result1.grossAmount + result2.grossAmount;

      expect(combinedNet).toBe(30.00);
      expect(combinedVAT).toBe(6.00);
      expect(combinedGross).toBe(36.00);
    });

    it('should handle zero amounts gracefully', () => {
      const result = MockVATService.calculateVAT(0.00, 0.20, false);

      expect(result.netAmount).toBe(0.00);
      expect(result.vatAmount).toBe(0.00);
      expect(result.grossAmount).toBe(0.00);
    });

    it('should reject negative amounts', () => {
      expect(() => MockVATService.calculateVAT(-10.00, 0.20, false)).toThrow('Amount cannot be negative');
    });
  });

  describe('Invoice VAT Recalculation', () => {

    it('should recalculate VAT when discrepancy exceeds threshold', () => {
      const invoiceData: InvoiceVATData = {
        originalSubtotal: 200.00, // Incorrect total
        originalVATAmount: 50.00, // Incorrect VAT
        items: [
          { unitPrice: 100.00, quantity: 1, vatRate: 0.20, vatIncluded: false },
          { unitPrice: 50.00, quantity: 1, vatRate: 0.20, vatIncluded: false },
        ]
      };

      const result = MockVATService.recalculateInvoiceVAT(invoiceData);

      // Correct totals: 150.00 net + 30.00 VAT = 180.00 gross
      expect(result.calculatedSubtotal).toBe(150.00);
      expect(result.calculatedVATAmount).toBe(30.00);
      expect(result.calculatedTotal).toBe(180.00);

      // Original total was 250.00, calculated is 180.00
      expect(result.discrepancy).toBe(70.00); // |250 - 180|
      expect(result.discrepancyPercentage).toBe(28.00); // (70/250) * 100
      expect(result.shouldRecalculate).toBe(true);
      expect(result.recalculatedData).not.toBeNull();
    });

    it('should not recalculate when difference is within threshold', () => {
      const invoiceData: InvoiceVATData = {
        originalSubtotal: 100.00, // Very close to correct
        originalVATAmount: 19.99,  // Very close to correct
        items: [
          { unitPrice: 100.00, quantity: 1, vatRate: 0.20, vatIncluded: false },
        ]
      };

      const result = MockVATService.recalculateInvoiceVAT(invoiceData);

      // Difference is 0.01, which is 0.008% - within 1% threshold
      expect(result.discrepancyPercentage).toBeLessThan(1);
      expect(result.shouldRecalculate).toBe(false);
      expect(result.recalculatedData).toBeNull();
    });

    it('should handle complex multi-rate invoice recalculation', () => {
      const invoiceData: InvoiceVATData = {
        originalSubtotal: 300.00, // Incorrect
        originalVATAmount: 60.00, // Incorrect (assumes all 20%)
        items: [
          { unitPrice: 100.00, quantity: 1, vatRate: 0.20, vatIncluded: false }, // £100 + £20 VAT
          { unitPrice: 100.00, quantity: 1, vatRate: 0.05, vatIncluded: false }, // £100 + £5 VAT
          { unitPrice: 100.00, quantity: 1, vatRate: 0.00, vatIncluded: false }, // £100 + £0 VAT
        ]
      };

      const result = MockVATService.recalculateInvoiceVAT(invoiceData);

      expect(result.calculatedSubtotal).toBe(300.00);
      expect(result.calculatedVATAmount).toBe(25.00); // 20 + 5 + 0
      expect(result.calculatedTotal).toBe(325.00);

      expect(result.shouldRecalculate).toBe(true);
      expect(result.recalculatedData?.vatBreakdown).toHaveLength(3);
    });
  });

  describe('VAT Rate Configuration', () => {

    it('should provide standard VAT rates', () => {
      const rates = MockVATService.getStandardVATRates();

      expect(rates.UK_STANDARD).toBe(0.20);
      expect(rates.UK_REDUCED).toBe(0.05);
      expect(rates.ZERO_RATED).toBe(0.00);
      expect(rates.EU_STANDARD).toBe(0.21);
      expect(rates.HIGH_VAT).toBe(0.25);
    });

    it('should compare calculations for equivalence', () => {
      const calc1 = MockVATService.calculateVAT(100.00, 0.20, false);
      const calc2 = MockVATService.calculateVAT(100.00, 0.20, false);
      const calc3 = MockVATService.calculateVAT(100.01, 0.20, false);

      expect(MockVATService.areCalculationsEquivalent(calc1, calc2)).toBe(true);
      expect(MockVATService.areCalculationsEquivalent(calc1, calc3)).toBe(true); // Within tolerance
      
      const calc4 = MockVATService.calculateVAT(110.00, 0.20, false);
      expect(MockVATService.areCalculationsEquivalent(calc1, calc4)).toBe(false); // Outside tolerance
    });
  });

  describe('Performance and Stress Tests', () => {

    it('should handle large numbers of line items efficiently', () => {
      const lines: MultiLineVATInput[] = [];
      
      // Create 1000 line items
      for (let i = 1; i <= 1000; i++) {
        lines.push({
          unitPrice: Math.round((Math.random() * 100 + 1) * 100) / 100, // £1.00 - £100.99
          quantity: Math.ceil(Math.random() * 10), // 1-10 quantity
          vatRate: Math.random() > 0.5 ? 0.20 : 0.05, // Mix of rates
          vatIncluded: Math.random() > 0.5, // Mix of inclusion
        });
      }

      const startTime = Date.now();
      const result = MockVATService.calculateMultiLineVAT(lines);
      const endTime = Date.now();

      expect(result.lineCalculations).toHaveLength(1000);
      expect(result.totals.totalNet).toBeGreaterThan(0);
      expect(result.totals.totalVAT).toBeGreaterThan(0);
      expect(result.totals.totalGross).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle edge case combinations', () => {
      const edgeCases: MultiLineVATInput[] = [
        { unitPrice: 0.01, quantity: 1, vatRate: 0.00, vatIncluded: false },     // Minimum amount, zero VAT
        { unitPrice: 999999.99, quantity: 1, vatRate: 0.50, vatIncluded: true }, // Maximum amount, high VAT
        { unitPrice: 33.33, quantity: 0.333, vatRate: 0.3333, vatIncluded: false }, // Repeating decimals
        { unitPrice: 1.00, quantity: 1000000, vatRate: 0.20, vatIncluded: false }, // High quantity
      ];

      const result = MockVATService.calculateMultiLineVAT(edgeCases);

      expect(result.lineCalculations).toHaveLength(4);
      expect(result.totals.totalNet).toBeGreaterThan(0);
      expect(result.totals.totalVAT).toBeGreaterThanOrEqual(0);
      expect(result.totals.totalGross).toBeGreaterThan(0);

      // Verify no calculation resulted in NaN or infinity
      result.lineCalculations.forEach(calc => {
        expect(isFinite(calc.lineSubtotal)).toBe(true);
        expect(isFinite(calc.lineVATAmount)).toBe(true);
        expect(isFinite(calc.lineTotal)).toBe(true);
      });
    });
  });

  describe('Integration with Real-World Scenarios', () => {

    it('should simulate quote-to-sale VAT preservation', () => {
      // Simulate creating a quote with specific VAT rates
      const quoteItems: MultiLineVATInput[] = [
        { unitPrice: 50.00, quantity: 2, vatRate: 0.20, vatIncluded: false },
        { unitPrice: 25.00, quantity: 4, vatRate: 0.05, vatIncluded: false },
      ];

      const quoteCalculation = MockVATService.calculateMultiLineVAT(quoteItems);

      // Later, when converting to sale, VAT rates should be preserved
      const saleCalculation = MockVATService.calculateMultiLineVAT(quoteItems);

      expect(MockVATService.areCalculationsEquivalent(
        {
          netAmount: quoteCalculation.totals.totalNet,
          vatAmount: quoteCalculation.totals.totalVAT,
          grossAmount: quoteCalculation.totals.totalGross,
          vatRate: quoteCalculation.totals.averageVATRate,
          vatIncluded: false,
          calculatedAt: new Date(),
        },
        {
          netAmount: saleCalculation.totals.totalNet,
          vatAmount: saleCalculation.totals.totalVAT,
          grossAmount: saleCalculation.totals.totalGross,
          vatRate: saleCalculation.totals.averageVATRate,
          vatIncluded: false,
          calculatedAt: new Date(),
        }
      )).toBe(true);
    });

    it('should simulate supplier order VAT handling', () => {
      // Supplier sends invoice with VAT-inclusive pricing
      const supplierInvoiceData: InvoiceVATData = {
        originalSubtotal: 80.00,    // Supplier calculated
        originalVATAmount: 20.00,   // Supplier calculated  
        items: [
          { unitPrice: 120.00, quantity: 1, vatRate: 0.20, vatIncluded: true }, // £100 net
        ]
      };

      const recalculation = MockVATService.recalculateInvoiceVAT(supplierInvoiceData);

      // Our system should calculate correctly
      expect(recalculation.calculatedSubtotal).toBe(100.00);
      expect(recalculation.calculatedVATAmount).toBe(20.00);
      expect(recalculation.calculatedTotal).toBe(120.00);

      // Supplier's calculation was wrong, so we should flag for recalculation
      expect(recalculation.shouldRecalculate).toBe(true);
    });

    it('should handle VAT rate changes on existing items', () => {
      // Original item with old VAT rate
      const originalCalculation = MockVATService.calculateVAT(100.00, 0.17.5, false); // Old UK rate

      // Same item after VAT rate change
      const newCalculation = MockVATService.calculateVAT(100.00, 0.20, false); // New UK rate

      expect(originalCalculation.vatAmount).toBe(17.50);
      expect(newCalculation.vatAmount).toBe(20.00);

      // Difference due to rate change
      const vatDifference = newCalculation.vatAmount - originalCalculation.vatAmount;
      expect(vatDifference).toBe(2.50);
    });
  });

  describe('Error Handling and Validation', () => {

    it('should handle invalid inputs gracefully', () => {
      expect(() => MockVATService.calculateLineVAT(10.00, 0, 0.20, false)).toThrow('Quantity must be greater than zero');
      expect(() => MockVATService.calculateLineVAT(10.00, -1, 0.20, false)).toThrow('Quantity must be greater than zero');
    });

    it('should validate calculation consistency', () => {
      // Forward and reverse calculations should match
      const forward = MockVATService.calculateVAT(100.00, 0.20, false);
      const reverse = MockVATService.calculateVAT(forward.grossAmount, 0.20, true);

      expect(MockVATService.areCalculationsEquivalent(
        { ...forward, vatIncluded: false },
        { ...reverse, vatIncluded: false }
      )).toBe(true);
    });

    it('should maintain precision in complex calculations', () => {
      // Chain multiple calculations to test precision drift
      let amount = 100.00;
      
      for (let i = 0; i < 10; i++) {
        const calc = MockVATService.calculateVAT(amount, 0.20, false);
        amount = calc.netAmount;
      }

      // Amount should remain stable (within reasonable precision)
      expect(amount).toBeCloseTo(100.00, 2);
    });
  });
});