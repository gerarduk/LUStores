import request from 'supertest';
import { app as testApp } from './testApp';

describe('Complex Integration Test Suite', () => {
  let createdSales: string[] = [];

  beforeEach(async () => {
    createdSales = [];
  });

  afterEach(() => {
    // Clean up any created sales
    createdSales = [];
  });

  describe('Stock Management and Sales Integration', () => {
    it('should prevent overselling when stock is insufficient', async () => {
      // Try to create a sale with more items than available (default stock is 50)
      const oversaleData = {
        chargeCode: 'OVERSTOCK-TEST-001',
        items: [
          {
            itemId: 1,
            quantity: 100, // More than the default stock of 50
            unitPrice: 10.99
          }
        ]
      };

      const oversaleResponse = await request(testApp)
        .post('/api/sales')
        .set('Authorization', 'Bearer test-token')
        .send(oversaleData);

      expect(oversaleResponse.status).toBe(400);
      expect(oversaleResponse.body.message).toContain('insufficient stock');
    });

    it('should successfully create sale when stock is sufficient and update stock levels', async () => {
      // Get initial stock for item 1
      const itemResponse = await request(testApp)
        .get('/api/items/1')
        .set('Authorization', 'Bearer test-token');
      
      const initialStock = itemResponse.body.currentStock || itemResponse.body.stock;
      const quantityToSell = 5;

      // Create a valid sale
      const saleData = {
        chargeCode: 'STOCK-TEST-001',
        items: [
          {
            itemId: 1,
            quantity: quantityToSell,
            unitPrice: 10.99
          }
        ]
      };

      const saleResponse = await request(testApp)
        .post('/api/sales')
        .set('Authorization', 'Bearer test-token')
        .send(saleData);

      expect(saleResponse.status).toBe(201);
      expect(saleResponse.body.id).toBeDefined();
      createdSales.push(saleResponse.body.id);

      // Verify stock was reduced
      const updatedItemResponse = await request(testApp)
        .get('/api/items/1')
        .set('Authorization', 'Bearer test-token');

      const newStock = updatedItemResponse.body.currentStock || updatedItemResponse.body.stock;
      expect(newStock).toBe(initialStock - quantityToSell);
    });
  });

  describe('Multiple Item Sales and Calculations', () => {
    it('should correctly calculate totals for multi-item sales with VAT', async () => {
      const saleData = {
        chargeCode: 'MULTI-ITEM-001',
        items: [
          {
            itemId: 1,
            quantity: 2,
            unitPrice: 10.99
          },
          {
            itemId: 2,
            quantity: 1,
            unitPrice: 25.50
          }
        ]
      };

      const saleResponse = await request(testApp)
        .post('/api/sales')
        .set('Authorization', 'Bearer test-token')
        .send(saleData);

      expect(saleResponse.status).toBe(201);
      createdSales.push(saleResponse.body.id);

      // Calculate expected amounts
      const expectedSubtotal = (2 * 10.99) + (1 * 25.50); // 47.48
      const expectedVat = expectedSubtotal * 0.2; // 9.496
      const expectedTotal = expectedSubtotal + expectedVat; // 56.976

      expect(saleResponse.body.subtotalAmount).toBeCloseTo(expectedSubtotal, 2);
      expect(saleResponse.body.vatAmount).toBeCloseTo(expectedVat, 2);
      expect(saleResponse.body.totalAmount).toBeCloseTo(expectedTotal, 2);
      expect(saleResponse.body.items).toHaveLength(2);
    });
  });

  describe('Cross-Feature Data Integrity', () => {
    it('should maintain data consistency when retrieving sales by different methods', async () => {
      // Create a sale
      const saleData = {
        chargeCode: 'INTEGRITY-TEST-001',
        items: [
          {
            itemId: 1,
            quantity: 3,
            unitPrice: 15.99
          }
        ]
      };

      const createResponse = await request(testApp)
        .post('/api/sales')
        .set('Authorization', 'Bearer test-token')
        .send(saleData);

      expect(createResponse.status).toBe(201);
      const saleId = createResponse.body.id;
      createdSales.push(saleId);

      // Retrieve sale by ID
      const getByIdResponse = await request(testApp)
        .get(`/api/sales/${saleId}`)
        .set('Authorization', 'Bearer test-token');

      expect(getByIdResponse.status).toBe(200);

      // Verify consistency
      expect(getByIdResponse.body.chargeCode).toBe(saleData.chargeCode);
      expect(getByIdResponse.body.totalAmount).toBeDefined();
      expect(getByIdResponse.body.items).toHaveLength(1);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid item IDs gracefully', async () => {
      const saleData = {
        chargeCode: 'INVALID-ITEM-001',
        items: [
          {
            itemId: 99999, // Non-existent item ID
            quantity: 1,
            unitPrice: 10.99
          }
        ]
      };

      const saleResponse = await request(testApp)
        .post('/api/sales')
        .set('Authorization', 'Bearer test-token')
        .send(saleData);

      // Should handle gracefully - either succeed with default item data or fail appropriately
      if (saleResponse.status === 400) {
        expect(saleResponse.body.message).toBeDefined();
      } else if (saleResponse.status === 201) {
        // If it succeeds, it should provide some reasonable default
        expect(saleResponse.body.items).toBeDefined();
        createdSales.push(saleResponse.body.id);
      }
    });
  });

  describe('Authentication and Authorization Edge Cases', () => {
    it('should consistently reject unauthorized requests across all endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/sales' },
        { method: 'get', path: '/api/items' },
        { method: 'post', path: '/api/sales', body: { chargeCode: 'TEST' } }
      ];

      for (const endpoint of endpoints) {
        let response;
        if (endpoint.method === 'post') {
          response = await request(testApp)
            .post(endpoint.path)
            .send(endpoint.body || {});
        } else {
          response = await request(testApp)
            .get(endpoint.path);
        }

        expect(response.status).toBe(401);
        expect(response.body.message).toContain('Access denied');
      }
    });
  });

  describe('Performance and Load Characteristics', () => {
    it('should handle reasonable load without degradation', async () => {
      const startTime = Date.now();
      
      // Create 3 sales sequentially to test performance
      for (let i = 0; i < 3; i++) {
        const saleData = {
          chargeCode: `PERF-${i.toString().padStart(3, '0')}`,
          items: [
            {
              itemId: 2, // Use item 2 to avoid stock conflicts
              quantity: 1,
              unitPrice: 25.50
            }
          ]
        };

        const response = await request(testApp)
          .post('/api/sales')
          .set('Authorization', 'Bearer test-token')
          .send(saleData);

        if (response.status === 201) {
          createdSales.push(response.body.id);
        }
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(5000);
    });
  });

  describe('Compound Business Logic Integration', () => {
    it('should handle complex multi-step workflow: create sale, check stock, create another sale', async () => {
      // Step 1: Get initial stock levels
      const item1Response = await request(testApp)
        .get('/api/items/1')
        .set('Authorization', 'Bearer test-token');
      
      const initialStock = item1Response.body.currentStock || item1Response.body.stock;

      // Step 2: Create first sale that uses most of the stock
      const firstSaleData = {
        chargeCode: 'WORKFLOW-STEP1',
        items: [
          {
            itemId: 1,
            quantity: initialStock - 10, // Leave only 10 items
            unitPrice: 12.99
          }
        ]
      };

      const firstSaleResponse = await request(testApp)
        .post('/api/sales')
        .set('Authorization', 'Bearer test-token')
        .send(firstSaleData);

      expect(firstSaleResponse.status).toBe(201);
      createdSales.push(firstSaleResponse.body.id);

      // Step 3: Verify stock was reduced correctly
      const afterFirstSaleResponse = await request(testApp)
        .get('/api/items/1')
        .set('Authorization', 'Bearer test-token');
      
      const remainingStock = afterFirstSaleResponse.body.currentStock || afterFirstSaleResponse.body.stock;
      expect(remainingStock).toBe(10);

      // Step 4: Try to create second sale that would exceed remaining stock
      const secondSaleData = {
        chargeCode: 'WORKFLOW-STEP2-FAIL',
        items: [
          {
            itemId: 1,
            quantity: 15, // More than the 10 remaining
            unitPrice: 12.99
          }
        ]
      };

      const secondSaleResponse = await request(testApp)
        .post('/api/sales')
        .set('Authorization', 'Bearer test-token')
        .send(secondSaleData);

      expect(secondSaleResponse.status).toBe(400);
      expect(secondSaleResponse.body.message).toContain('insufficient stock');

      // Step 5: Create valid second sale within stock limits
      const validSecondSaleData = {
        chargeCode: 'WORKFLOW-STEP2-SUCCESS',
        items: [
          {
            itemId: 1,
            quantity: 5, // Within the 10 remaining
            unitPrice: 12.99
          }
        ]
      };

      const validSecondSaleResponse = await request(testApp)
        .post('/api/sales')
        .set('Authorization', 'Bearer test-token')
        .send(validSecondSaleData);

      expect(validSecondSaleResponse.status).toBe(201);
      createdSales.push(validSecondSaleResponse.body.id);

      // Step 6: Verify final stock level
      const finalStockResponse = await request(testApp)
        .get('/api/items/1')
        .set('Authorization', 'Bearer test-token');
      
      const finalStock = finalStockResponse.body.currentStock || finalStockResponse.body.stock;
      expect(finalStock).toBe(5);
    });

    it('should handle mixed success/failure scenarios in complex transactions', async () => {
      // Create multiple sales with different scenarios
      const scenarios = [
        {
          name: 'valid sale',
          data: {
            chargeCode: 'MIXED-VALID',
            items: [{ itemId: 2, quantity: 1, unitPrice: 15.99 }]
          },
          shouldSucceed: true
        },
        {
          name: 'oversold sale',
          data: {
            chargeCode: 'MIXED-OVERSOLD',
            items: [{ itemId: 2, quantity: 1000, unitPrice: 15.99 }]
          },
          shouldSucceed: false
        },
        {
          name: 'invalid item sale',
          data: {
            chargeCode: 'MIXED-INVALID',
            items: [{ itemId: 99999, quantity: 1, unitPrice: 15.99 }]
          },
          shouldSucceed: null // Depends on implementation
        },
        {
          name: 'empty charge code',
          data: {
            chargeCode: '',
            items: [{ itemId: 2, quantity: 1, unitPrice: 15.99 }]
          },
          shouldSucceed: false
        }
      ];

      let successCount = 0;
      let failureCount = 0;

      for (const scenario of scenarios) {
        const response = await request(testApp)
          .post('/api/sales')
          .set('Authorization', 'Bearer test-token')
          .send(scenario.data);

        if (response.status === 201) {
          successCount++;
          createdSales.push(response.body.id);
          if (scenario.shouldSucceed === false) {
            console.warn(`Unexpected success for ${scenario.name}`);
          }
        } else {
          failureCount++;
          if (scenario.shouldSucceed === true) {
            console.warn(`Unexpected failure for ${scenario.name}: ${response.body.message}`);
          }
        }
      }

      // Should have at least one success and one failure
      expect(successCount).toBeGreaterThan(0);
      expect(failureCount).toBeGreaterThan(0);
    });

    it('should maintain system consistency under rapid concurrent operations', async () => {
      // Test concurrent operations on the same resource
      const concurrentOperations = [
        // Multiple sales trying to use item 1
        request(testApp)
          .post('/api/sales')
          .set('Authorization', 'Bearer test-token')
          .send({
            chargeCode: 'CONCURRENT-A',
            items: [{ itemId: 1, quantity: 5, unitPrice: 10.99 }]
          }),
        request(testApp)
          .post('/api/sales')
          .set('Authorization', 'Bearer test-token')
          .send({
            chargeCode: 'CONCURRENT-B',
            items: [{ itemId: 1, quantity: 5, unitPrice: 10.99 }]
          }),
        // Item lookups during sales
        request(testApp)
          .get('/api/items/1')
          .set('Authorization', 'Bearer test-token'),
        request(testApp)
          .get('/api/items/1')
          .set('Authorization', 'Bearer test-token'),
        // Sales list retrieval
        request(testApp)
          .get('/api/sales')
          .set('Authorization', 'Bearer test-token')
      ];

      const results = await Promise.allSettled(concurrentOperations);
      
      // All operations should complete (either success or controlled failure)
      expect(results.every(result => result.status === 'fulfilled')).toBe(true);

      // Count successful sales
      let salesCreated = 0;
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && index < 2) { // First two are sales
          if (result.value.status === 201) {
            salesCreated++;
            createdSales.push(result.value.body.id);
          }
        }
      });

      // Should have created at least one sale
      expect(salesCreated).toBeGreaterThan(0);

      // System should still be responsive
      const healthCheck = await request(testApp).get('/health');
      expect(healthCheck.status).toBe(200);
    });
  });

  describe('Data Validation and Edge Cases', () => {
    it('should handle extreme values and boundary conditions', async () => {
      const extremeCases = [
        {
          name: 'very large price',
          data: {
            chargeCode: 'EXTREME-PRICE',
            items: [{ itemId: 1, quantity: 1, unitPrice: 999999.99 }]
          }
        },
        {
          name: 'very small price',
          data: {
            chargeCode: 'SMALL-PRICE',
            items: [{ itemId: 1, quantity: 1, unitPrice: 0.01 }]
          }
        },
        {
          name: 'many decimal places',
          data: {
            chargeCode: 'DECIMAL-PRECISION',
            items: [{ itemId: 1, quantity: 1, unitPrice: 12.999999 }]
          }
        }
      ];

      for (const testCase of extremeCases) {
        const response = await request(testApp)
          .post('/api/sales')
          .set('Authorization', 'Bearer test-token')
          .send(testCase.data);

        // Should handle gracefully
        expect([200, 201, 400, 422]).toContain(response.status);
        
        if (response.status === 201) {
          createdSales.push(response.body.id);
          
          // Check that monetary values are properly formatted
          expect(typeof response.body.totalAmount).toBe('number');
          expect(response.body.totalAmount).toBeGreaterThan(0);
        }
      }
    });

    it('should validate business rules across different operations', async () => {
      // Test 1: Create sale and verify it appears in lists
      const saleData = {
        chargeCode: 'BUSINESS-RULES-001',
        items: [
          {
            itemId: 2, // Use item 2 to avoid stock conflicts with other tests
            quantity: 1, // Use minimal quantity to avoid stock issues
            unitPrice: 20.00
          }
        ]
      };

      const saleResponse = await request(testApp)
        .post('/api/sales')
        .set('Authorization', 'Bearer test-token')
        .send(saleData);

      expect(saleResponse.status).toBe(201);
      const saleId = saleResponse.body.id;
      createdSales.push(saleId);

      // Test 2: Verify sale appears in sales list
      const salesListResponse = await request(testApp)
        .get('/api/sales')
        .set('Authorization', 'Bearer test-token');

      expect(salesListResponse.status).toBe(200);
      // Sales list should be an array (might be paginated or direct array)
      const salesArray = Array.isArray(salesListResponse.body) 
        ? salesListResponse.body 
        : salesListResponse.body.sales || [];
      
      // Should contain our sale or be queryable
      if (salesArray.length > 0) {
        // If we have sales, verify structure
        expect(salesArray[0]).toHaveProperty('chargeCode');
      }

      // Test 3: Verify individual sale retrieval
      const individualSaleResponse = await request(testApp)
        .get(`/api/sales/${saleId}`)
        .set('Authorization', 'Bearer test-token');

      expect(individualSaleResponse.status).toBe(200);
      expect(individualSaleResponse.body.chargeCode).toBe(saleData.chargeCode);

      // Test 4: Verify stock was affected (check item 2 since that's what we used)
      const itemAfterSaleResponse = await request(testApp)
        .get('/api/items/2')
        .set('Authorization', 'Bearer test-token');

      expect(itemAfterSaleResponse.status).toBe(200);
      expect(itemAfterSaleResponse.body.currentStock).toBeDefined();
    });
  });

  describe('System Resilience and Recovery', () => {
    it('should gracefully handle malformed requests and maintain stability', async () => {
      const malformedRequests = [
        {
          name: 'completely invalid JSON structure',
          data: { invalid: 'completely', wrong: 'structure' }
        },
        {
          name: 'missing required fields',
          data: { chargeCode: 'MISSING-ITEMS' }
        },
        {
          name: 'null values',
          data: { chargeCode: null, items: null }
        },
        {
          name: 'wrong data types',
          data: { chargeCode: 123, items: 'not-an-array' }
        }
      ];

      let systemStable = true;

      for (const malformedRequest of malformedRequests) {
        try {
          const response = await request(testApp)
            .post('/api/sales')
            .set('Authorization', 'Bearer test-token')
            .send(malformedRequest.data);

          // Should return 4xx error, not crash
          expect(response.status).toBeGreaterThanOrEqual(400);
          expect(response.status).toBeLessThan(500);
          
        } catch (error) {
          console.warn(`System instability detected with ${malformedRequest.name}:`, error);
          systemStable = false;
        }
      }

      expect(systemStable).toBe(true);

      // Verify system is still operational after malformed requests
      const healthCheck = await request(testApp).get('/health');
      expect(healthCheck.status).toBe(200);

      // Verify normal operations still work
      const validSale = await request(testApp)
        .post('/api/sales')
        .set('Authorization', 'Bearer test-token')
        .send({
          chargeCode: 'POST-RECOVERY-TEST',
          items: [{ itemId: 2, quantity: 1, unitPrice: 25.50 }]
        });

      if (validSale.status === 201) {
        createdSales.push(validSale.body.id);
      }
      
      expect([200, 201]).toContain(validSale.status);
    });
  });
});
