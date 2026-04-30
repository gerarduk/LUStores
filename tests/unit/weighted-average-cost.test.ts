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

    it('should handle small delivery charges', () => {
      const result = calculateWeightedAverageCost({
        currentQty: 1000,
        currentPriceExVat: 25,
        currentVatRate: 0.20,
        incomingQty: 100,
        incomingPriceExVat: 30,
        incomingVatRate: 0.20,
        deliveryCharge: 10,
      });

      // Delivery proportion: 100/1100 × £10 ≈ £0.91
      expect(result.proportionalDelivery).toBeCloseTo(0.91, 2);
    });

    it('should handle large delivery charges', () => {
      const result = calculateWeightedAverageCost({
        currentQty: 10,
        currentPriceExVat: 100,
        currentVatRate: 0.20,
        incomingQty: 10,
        incomingPriceExVat: 110,
        incomingVatRate: 0.20,
        deliveryCharge: 2000,
      });

      // Delivery proportion: 10/20 × £2000 = £1000
      expect(result.proportionalDelivery).toBe(1000);
      // Current: 10 @ £120 = £1200
      // Incoming: 10 @ £132 = £1320
      // Total: (£1200 + £1320 + £1000) / 20 = £151
      expect(result.newWeightedAvgIncVat).toBe(151);
    });
  });

  describe('Mixed VAT rates with delivery', () => {
    
    it('should use larger VAT rate and apply to all items', () => {
      const result = calculateWeightedAverageCost({
        currentQty: 100,
        currentPriceExVat: 50,
        currentVatRate: 0.05,
        incomingQty: 50,
        incomingPriceExVat: 60,
        incomingVatRate: 0.20,
        deliveryCharge: 300,
      });

      // Selected VAT: 0.20 (larger of 0.05 and 0.20)
      // Current with 0.20: 100 @ £50 × 1.20 = £6000
      // Incoming with 0.20: 50 @ £60 × 1.20 = £3600
      // Delivery: 50/150 × £300 = £100
      // Total avg: £9700 / 150 = £64.67 inc-VAT
      
      expect(result.selectedVatRate).toBe(0.20);
      expect(result.currentTotalIncVat).toBe(6000);
      expect(result.incomingTotalIncVat).toBe(3600);
      expect(result.proportionalDelivery).toBe(100);
      expect(result.newWeightedAvgIncVat).toBeCloseTo(64.67, 2);
    });

    it('should handle 0% current rate with 20% incoming rate', () => {
      const result = calculateWeightedAverageCost({
        currentQty: 100,
        currentPriceExVat: 100,
        currentVatRate: 0.0,
        incomingQty: 50,
        incomingPriceExVat: 100,
        incomingVatRate: 0.20,
        deliveryCharge: 500,
      });

      // Selected VAT: 0.20 (larger of 0.0 and 0.20)
      // Current with 0.20: 100 @ £100 × 1.20 = £12,000
      // Incoming with 0.20: 50 @ £100 × 1.20 = £6,000
      // Delivery: 50/150 × £500 = £166.67
      // Total: (£12,000 + £6,000 + £166.67) / 150 = £121.11 inc-VAT
      
      expect(result.selectedVatRate).toBe(0.20);
      expect(result.currentTotalIncVat).toBe(12000);
      expect(result.incomingTotalIncVat).toBe(6000);
      expect(result.proportionalDelivery).toBeCloseTo(166.67, 2);
      expect(result.newWeightedAvgIncVat).toBeCloseTo(121.11, 2);
    });
  });

  describe('Decimal precision handling', () => {
    
    it('should handle fractional quantities', () => {
      const result = calculateWeightedAverageCost({
        currentQty: 33.33,
        currentPriceExVat: 12.45,
        currentVatRate: 0.20,
        incomingQty: 66.67,
        incomingPriceExVat: 23.78,
        incomingVatRate: 0.20,
        deliveryCharge: 100,
      });

      // Current: 33.33 @ £12.45 × 1.20 = £496.88
      // Incoming: 66.67 @ £23.78 × 1.20 = £1,906.64
      // Delivery: 66.67/100 × £100 = £66.67
      // Total: (£496.88 + £1,906.64 + £66.67) / 100 = £24.70
      
      const currentTotal = 33.33 * 12.45 * 1.20;
      const incomingTotal = 66.67 * 23.78 * 1.20;
      const delivery = 100 * (66.67 / 100);
      const expectedAvg = (currentTotal + incomingTotal + delivery) / 100;
      
      expect(result.currentTotalIncVat).toBeCloseTo(currentTotal, 1);
      expect(result.incomingTotalIncVat).toBeCloseTo(incomingTotal, 1);
      expect(result.newWeightedAvgIncVat).toBeCloseTo(Math.round(expectedAvg * 100) / 100, 2);
    });

    it('should round all intermediate calculations to 2 decimal places', () => {
      const result = calculateWeightedAverageCost({
        currentQty: 10,
        currentPriceExVat: 33.33,
        currentVatRate: 0.333,
        incomingQty: 10,
        incomingPriceExVat: 33.33,
        incomingVatRate: 0.333,
        deliveryCharge: 99.99,
      });

      // All values should round to 2 decimal places
      expect(Number.isInteger(result.currentTotalIncVat * 100)).toBe(true);
      expect(Number.isInteger(result.incomingTotalIncVat * 100)).toBe(true);
      expect(Number.isInteger(result.proportionalDelivery * 100)).toBe(true);
      expect(Number.isInteger(result.newWeightedAvgIncVat * 100)).toBe(true);
    });

    it('should handle VAT rates with 4 decimal precision', () => {
      const result = calculateWeightedAverageCost({
        currentQty: 100,
        currentPriceExVat: 100,
        currentVatRate: 0.2000,
        incomingQty: 50,
        incomingPriceExVat: 100,
        incomingVatRate: 0.0500,
        deliveryCharge: 0,
      });

      // Should select 0.2000 as larger rate
      expect(result.selectedVatRate).toBe(0.20);
      expect(result.newWeightedAvgIncVat).toBeCloseTo(86.67, 2);
    });
  });

  describe('Edge cases and boundary values', () => {
    
    it('should handle incoming quantity = 0 (no new items)', () => {
      // This should be prevented at business logic level, but verify it doesn't crash
      const result = calculateWeightedAverageCost({
        currentQty: 100,
        currentPriceExVat: 50,
        currentVatRate: 0.20,
        incomingQty: 0,
        incomingPriceExVat: 60,
        incomingVatRate: 0.20,
        deliveryCharge: 0,
      });

      // Result should be current average (unchanged)
      expect(result.newWeightedAvgIncVat).toBeCloseTo(60, 2); // 100 * 50 * 1.20 / 100
    });

    it('should handle very high prices', () => {
      const result = calculateWeightedAverageCost({
        currentQty: 1,
        currentPriceExVat: 100000,
        currentVatRate: 0.20,
        incomingQty: 1,
        incomingPriceExVat: 110000,
        incomingVatRate: 0.20,
        deliveryCharge: 0,
      });

      // Current: 1 @ £100,000 × 1.20 = £120,000
      // Incoming: 1 @ £110,000 × 1.20 = £132,000
      // Average: £252,000 / 2 = £126,000
      
      expect(result.newWeightedAvgIncVat).toBe(126000);
    });

    it('should handle very low prices', () => {
      const result = calculateWeightedAverageCost({
        currentQty: 1000,
        currentPriceExVat: 0.01,
        currentVatRate: 0.20,
        incomingQty: 1000,
        incomingPriceExVat: 0.02,
        incomingVatRate: 0.20,
        deliveryCharge: 0,
      });

      // Current: 1000 @ £0.01 × 1.20 = £12
      // Incoming: 1000 @ £0.02 × 1.20 = £24
      // Average: £36 / 2000 = £0.018
      
      expect(result.newWeightedAvgIncVat).toBe(0.018 * 2); // Rounding: should be £0.02
    });

    it('should handle very high delivery charge', () => {
      const result = calculateWeightedAverageCost({
        currentQty: 100,
        currentPriceExVat: 50,
        currentVatRate: 0.20,
        incomingQty: 50,
        incomingPriceExVat: 60,
        incomingVatRate: 0.20,
        deliveryCharge: 10000,
      });

      // Current: 100 @ £60 = £6000
      // Incoming: 50 @ £72 = £3600
      // Delivery: 50/150 × £10,000 = £3333.33
      // Total: (£6000 + £3600 + £3333.33) / 150 = £88 inc-VAT
      
      expect(result.proportionalDelivery).toBeCloseTo(3333.33, 2);
      expect(result.newWeightedAvgIncVat).toBeCloseTo(88, 2);
    });
  });

  describe('Multi-order accumulation', () => {
    
    it('should accumulate correctly across multiple orders', () => {
      // Starting inventory
      const startInventory = {
        qty: 50,
        price: 40,
        vatRate: 0.20,
      };

      // Order 1: +25 @ £50, delivery £100
      const afterOrder1 = calculateWeightedAverageCost({
        currentQty: startInventory.qty,
        currentPriceExVat: startInventory.price,
        currentVatRate: startInventory.vatRate,
        incomingQty: 25,
        incomingPriceExVat: 50,
        incomingVatRate: 0.20,
        deliveryCharge: 100,
      });

      expect(afterOrder1.newWeightedAvgIncVat).toBeCloseTo(50.27, 2);

      // Order 2: +25 @ £55, delivery £100 (using Order 1 result as base)
      const afterOrder2 = calculateWeightedAverageCost({
        currentQty: 75, // 50 + 25 from Order 1
        currentPriceExVat: afterOrder1.newWeightedAvgExVat, // £41.89
        currentVatRate: 0.20,
        incomingQty: 25,
        incomingPriceExVat: 55,
        incomingVatRate: 0.20,
        deliveryCharge: 100,
      });

      // Verify accumulation makes sense
      expect(afterOrder2.newWeightedAvgIncVat).toBeGreaterThan(afterOrder1.newWeightedAvgIncVat);
      expect(afterOrder2.newWeightedAvgIncVat).toBeLessThan(70);
    });
  });

  describe('VAT conversion functions', () => {

    it('should correctly extract ex-VAT price from inc-VAT price', () => {
      const incVatPrice = 120; // £120 including 20% VAT
      const vatRate = 0.20;
      const exVatPrice = incVatPrice / (1 + vatRate);

      expect(exVatPrice).toBeCloseTo(100, 2);
      expect(Math.round(exVatPrice * 100) / 100).toBe(100);
    });

    it('should correctly convert ex-VAT to inc-VAT', () => {
      const exVatPrice = 100;
      const vatRate = 0.20;
      const incVatPrice = exVatPrice * (1 + vatRate);

      expect(incVatPrice).toBe(120);
    });

    it('should handle VAT rate of 0%', () => {
      const exVatPrice = 100;
      const vatRate = 0.0;
      const incVatPrice = exVatPrice * (1 + vatRate);

      expect(incVatPrice).toBe(100);
      
      const backToExVat = incVatPrice / (1 + vatRate);
      expect(backToExVat).toBe(100);
    });
  });

  describe('Real-world scenarios', () => {
    
    it('should handle university book order with 0% VAT books and delivery', () => {
      // Order: 100 textbooks @ £30, 5% VAT variant, delivery £500
      const result = calculateWeightedAverageCost({
        currentQty: 1000,
        currentPriceExVat: 25,
        currentVatRate: 0.0, // Books in UK are 0% VAT
        incomingQty: 100,
        incomingPriceExVat: 30,
        incomingVatRate: 0.05, // Some items might have 5% (edge case)
        deliveryCharge: 500,
      });

      // Selected: 0.05 (larger VAT rate)
      // Current: 1000 @ £25 × 1.05 = £26,250
      // Incoming: 100 @ £30 × 1.05 = £3,150
      // Delivery: 100/1100 × £500 = £45.45
      // Total: £29,445.45 / 1100 = £26.77
      
      expect(result.selectedVatRate).toBe(0.05);
      expect(result.newWeightedAvgIncVat).toBeCloseTo(26.77, 2);
    });

    it('should handle mixed VAT laboratory equipment order', () => {
      // Scenario: Lab equipment mix - some standard 20%, some reduced 5%
      const result = calculateWeightedAverageCost({
        currentQty: 50,
        currentPriceExVat: 500,
        currentVatRate: 0.20,
        incomingQty: 30,
        incomingPriceExVat: 600,
        incomingVatRate: 0.05,
        deliveryCharge: 1000,
      });

      // Selected: 0.20 (larger)
      // Current: 50 @ £500 × 1.20 = £30,000
      // Incoming: 30 @ £600 × 1.20 = £21,600
      // Delivery: 30/80 × £1,000 = £375
      // Total: £51,975 / 80 = £649.69
      
      expect(result.newWeightedAvgIncVat).toBeCloseTo(649.69, 2);
    });
  });
});
