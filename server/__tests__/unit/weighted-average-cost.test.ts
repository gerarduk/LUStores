/**
 * Weighted Average Cost Calculation Tests
 * 
 * Business Rule:
 * - Use larger VAT rate when rates differ
 * - Split delivery charge proportionally by item value/total order value
 * - Formula: (current_qty × current_price_inc_vat + delivered_qty × delivered_price_inc_vat + proportional_delivery) / (current_qty + delivered_qty)
 * - All calculations to 2 decimal places
 */

import { describe, it, expect } from '@jest/globals';

/**
 * Helper function to calculate weighted average cost
 */
function calculateWeightedAverageCost(params: {
  currentQty: number;
  currentPriceExVat: number;
  currentVatRate: number;
  incomingQty: number;
  incomingPriceExVat: number;
  incomingVatRate: number;
  deliveryCharge: number;
}): {
  selectedVatRate: number;
  currentTotalIncVat: number;
  incomingTotalIncVat: number;
  proportionalDelivery: number;
  combinedTotal: number;
  newWeightedAvgIncVat: number;
  newWeightedAvgExVat: number;
} {
  // 1. Select larger VAT rate
  const selectedVatRate = Math.max(params.currentVatRate, params.incomingVatRate);

  // 2. Calculate current inventory total (inc VAT)
  const currentPriceIncVat = params.currentPriceExVat * (1 + selectedVatRate);
  const currentTotalIncVat = params.currentQty * currentPriceIncVat;

  // 3. Calculate incoming order total
  // Use the selected VAT rate for incoming items (even if their rate was lower)
  const incomingPriceIncVat = params.incomingPriceExVat * (1 + selectedVatRate);
  const incomingTotalIncVat = params.incomingQty * incomingPriceIncVat;

  // 4. Calculate proportional delivery charge
  // Delivery is split by proportion of item qty to total qty
  const totalQty = params.currentQty + params.incomingQty;
  const incomingProportion = params.incomingQty / totalQty;
  const proportionalDelivery = params.deliveryCharge * incomingProportion;

  // 5. Calculate combined total
  const combinedTotal = currentTotalIncVat + incomingTotalIncVat + proportionalDelivery;

  // 6. Calculate new weighted average (inc VAT)
  const newWeightedAvgIncVat = combinedTotal / totalQty;

  // 7. Convert back to ex-VAT if needed
  const newWeightedAvgExVat = newWeightedAvgIncVat / (1 + selectedVatRate);

  return {
    selectedVatRate,
    currentTotalIncVat: Math.round(currentTotalIncVat * 100) / 100,
    incomingTotalIncVat: Math.round(incomingTotalIncVat * 100) / 100,
    proportionalDelivery: Math.round(proportionalDelivery * 100) / 100,
    combinedTotal: Math.round(combinedTotal * 100) / 100,
    newWeightedAvgIncVat: Math.round(newWeightedAvgIncVat * 100) / 100,
    newWeightedAvgExVat: Math.round(newWeightedAvgExVat * 100) / 100,
  };
}

describe('Weighted Average Cost Calculation', () => {
  
  describe('Basic weighted average without delivery', () => {
    
    it('should calculate weighted average with same VAT rates', () => {
      const result = calculateWeightedAverageCost({
        currentQty: 100,
        currentPriceExVat: 50,
        currentVatRate: 0.20,
        incomingQty: 50,
        incomingPriceExVat: 60,
        incomingVatRate: 0.20,
        deliveryCharge: 0,
      });

      // Current: 100 @ £50 ex-VAT = 100 @ £60 inc-VAT = £6000
      // Incoming: 50 @ £60 ex-VAT = 50 @ £72 inc-VAT = £3600
      // Combined: £9600 / 150 = £64 inc-VAT per unit
      
      expect(result.selectedVatRate).toBe(0.20);
      expect(result.currentTotalIncVat).toBe(6000);
      expect(result.incomingTotalIncVat).toBe(3600);
      expect(result.proportionalDelivery).toBe(0);
      expect(result.combinedTotal).toBe(9600);
      expect(result.newWeightedAvgIncVat).toBe(64);
      expect(result.newWeightedAvgExVat).toBeCloseTo(53.33, 2);
    });

    it('should calculate weighted average with different VAT rates (uses larger)', () => {
      const result = calculateWeightedAverageCost({
        currentQty: 100,
        currentPriceExVat: 50,
        currentVatRate: 0.05,
        incomingQty: 50,
        incomingPriceExVat: 60,
        incomingVatRate: 0.20,
        deliveryCharge: 0,
      });

      // Selected VAT: 0.20 (larger of 0.05 and 0.20)
      // Current: 100 @ £50 ex-VAT = 100 @ £60 inc-VAT = £6000
      // Incoming: 50 @ £60 ex-VAT = 50 @ £72 inc-VAT = £3600
      // Combined: £9600 / 150 = £64 inc-VAT
      
      expect(result.selectedVatRate).toBe(0.20);
      expect(result.currentTotalIncVat).toBe(6000); // 100 * 50 * 1.20
      expect(result.incomingTotalIncVat).toBe(3600); // 50 * 60 * 1.20
      expect(result.newWeightedAvgIncVat).toBe(64);
    });

    it('should handle 0% VAT rate correctly', () => {
      const result = calculateWeightedAverageCost({
        currentQty: 100,
        currentPriceExVat: 50,
        currentVatRate: 0.0,
        incomingQty: 50,
        incomingPriceExVat: 60,
        incomingVatRate: 0.0,
        deliveryCharge: 0,
      });

      // Selected VAT: 0.0
      // Current: 100 @ £50 = £5000
      // Incoming: 50 @ £60 = £3000
      // Combined: £8000 / 150 = £53.33
      
      expect(result.selectedVatRate).toBe(0.0);
      expect(result.currentTotalIncVat).toBe(5000);
      expect(result.incomingTotalIncVat).toBe(3000);
      expect(result.newWeightedAvgIncVat).toBeCloseTo(53.33, 2);
    });
  });

  describe('Weighted average with delivery charges', () => {
    
    it('should split delivery charge proportionally', () => {
      const result = calculateWeightedAverageCost({
        currentQty: 100,
        currentPriceExVat: 50,
        currentVatRate: 0.20,
        incomingQty: 50,
        incomingPriceExVat: 60,
        incomingVatRate: 0.20,
        deliveryCharge: 300,
      });

      // Current: 100 @ £60 inc-VAT = £6000
      // Incoming: 50 @ £72 inc-VAT = £3600
      // Delivery proportion: 50/150 = 1/3 × £300 = £100
      // Combined: (£6000 + £3600 + £100) / 150 = £64.67
      
      expect(result.proportionalDelivery).toBe(100);
      expect(result.combinedTotal).toBe(9700);
      expect(result.newWeightedAvgIncVat).toBeCloseTo(64.67, 2);
    });

    it('should distribute delivery as 50/50 for equal quantities', () => {
      const result = calculateWeightedAverageCost({
        currentQty: 100,
        currentPriceExVat: 50,
        currentVatRate: 0.20,
        incomingQty: 100,
        incomingPriceExVat: 60,
        incomingVatRate: 0.20,
        deliveryCharge: 200,
      });

      // Delivery proportion: 100/200 = 0.5 × £200 = £100
      expect(result.proportionalDelivery).toBe(100);
    });

    it('should handle zero delivery charges', () => {
      const result = calculateWeightedAverageCost({
        currentQty: 1000,
        currentPriceExVat: 25,
        currentVatRate: 0.20,
        incomingQty: 100,
        incomingPriceExVat: 30,
        incomingVatRate: 0.20,
        deliveryCharge: 0,
      });

      expect(result.proportionalDelivery).toBe(0);
    });
  });

  describe('Edge cases and validations', () => {
    
    it('should handle VAT rate with 4 decimal precision', () => {
      const result = calculateWeightedAverageCost({
        currentQty: 100,
        currentPriceExVat: 100,
        currentVatRate: 0.2000,
        incomingQty: 50,
        incomingPriceExVat: 100,
        incomingVatRate: 0.0500,
        deliveryCharge: 0,
      });

      expect(result.selectedVatRate).toBe(0.20);
    });

    it('should round all values to 2 decimal places', () => {
      const result = calculateWeightedAverageCost({
        currentQty: 10,
        currentPriceExVat: 33.333,
        currentVatRate: 0.333,
        incomingQty: 10,
        incomingPriceExVat: 33.333,
        incomingVatRate: 0.333,
        deliveryCharge: 99.99,
      });

      // All values should be integers when multiplied by 100
      expect(Number.isInteger(result.currentTotalIncVat * 100)).toBe(true);
      expect(Number.isInteger(result.incomingTotalIncVat * 100)).toBe(true);
    });
  });

  describe('Real-world scenarios', () => {
    
    it('should handle university textbook order', () => {
      const result = calculateWeightedAverageCost({
        currentQty: 1000,
        currentPriceExVat: 25,
        currentVatRate: 0.0, // Books are zero VAT
        incomingQty: 100,
        incomingPriceExVat: 30,
        incomingVatRate: 0.05,
        deliveryCharge: 500,
      });

      // Selected: 0.05 (larger VAT rate)
      expect(result.selectedVatRate).toBe(0.05);
    });

    it('should produce valid numeric results', () => {
      const result = calculateWeightedAverageCost({
        currentQty: 100,
        currentPriceExVat: 50,
        currentVatRate: 0.20,
        incomingQty: 50,
        incomingPriceExVat: 60,
        incomingVatRate: 0.20,
        deliveryCharge: 300,
      });

      // All numeric results should be finite
      expect(Number.isFinite(result.newWeightedAvgIncVat)).toBe(true);
      expect(Number.isFinite(result.newWeightedAvgExVat)).toBe(true);
      expect(result.newWeightedAvgIncVat).toBeGreaterThan(0);
    });
  });
});
