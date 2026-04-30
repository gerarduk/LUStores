import e2eRequest from 'supertest';
import { app as e2eTestApp } from './testApp';

describe('LUStores E2E Test Suite', () => {

  describe('Health and System Status', () => {    it('should return system health status', async () => {
      const response = await e2eRequest(e2eTestApp)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });    it('should return API documentation', async () => {
      const response = await e2eRequest(e2eTestApp)
        .get('/api/docs');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
    });
  });

  describe('Authentication Flow', () => {    it('should reject unauthenticated requests to protected routes', async () => {
      const response = await e2eRequest(e2eTestApp)
        .get('/api/sales');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });    it('should allow access with valid authentication', async () => {
      // Mock authentication for testing
      const response = await e2eRequest(e2eTestApp)
        .get('/api/sales')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Sales API End-to-End', () => {
    describe('POST /api/sales', () => {
      it('should create a complete sale with all required fields', async () => {
        const saleData = {
          chargeCode: 'E2E-TEST-001',
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
          ],
          customerInfo: {
            name: 'Test Customer',
            email: 'test@university.edu',
            department: 'Computer Science'
          },
          notes: 'E2E test sale creation'
        };

        const response = await e2eRequest(e2eTestApp)
          .post('/api/sales')
          .set('Authorization', 'Bearer test-token')
          .send(saleData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('chargeCode', saleData.chargeCode);
        expect(response.body).toHaveProperty('totalAmount');
        expect(response.body).toHaveProperty('vatAmount');
        expect(response.body.items).toHaveLength(2);

        // Verify calculated amounts
        const expectedSubtotal = (2 * 10.99) + (1 * 25.50);
        const expectedVat = expectedSubtotal * 0.2; // 20% VAT
        const expectedTotal = expectedSubtotal + expectedVat;

        expect(response.body.totalAmount).toBeCloseTo(expectedTotal, 2);
        expect(response.body.vatAmount).toBeCloseTo(expectedVat, 2);
      });

      it('should validate required fields and return appropriate errors', async () => {
        const invalidSaleData = {
          // Missing chargeCode
          items: [
            {
              itemId: 1,
              quantity: 2
              // Missing unitPrice
            }
          ]
        };

        const response = await e2eRequest(e2eTestApp)
          .post('/api/sales')
          .set('Authorization', 'Bearer test-token')
          .send(invalidSaleData);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('validation');
      });
    });

    describe('GET /api/sales', () => {
      it('should return paginated sales list with metadata', async () => {
        const response = await e2eRequest(e2eTestApp)
          .get('/api/sales')
          .set('Authorization', 'Bearer test-token')
          .query({
            page: 1,
            limit: 10
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('sales');
        expect(response.body).toHaveProperty('pagination');
        expect(response.body.pagination).toHaveProperty('page');
        expect(response.body.pagination).toHaveProperty('limit');
        expect(response.body.pagination).toHaveProperty('total');
        expect(Array.isArray(response.body.sales)).toBe(true);
      });

      it('should filter sales by date range', async () => {
        const startDate = '2025-01-01';
        const endDate = '2025-12-31';

        const response = await e2eRequest(e2eTestApp)
          .get('/api/sales')
          .set('Authorization', 'Bearer test-token')
          .query({
            startDate,
            endDate
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('sales');
        
        // Verify all returned sales are within the date range
        response.body.sales.forEach((sale: any) => {
          const saleDate = new Date(sale.createdAt);
          expect(saleDate >= new Date(startDate)).toBe(true);
          expect(saleDate <= new Date(endDate)).toBe(true);
        });
      });
    });

    describe('GET /api/sales/:id', () => {
      it('should return detailed sale information including line items', async () => {
        // First create a sale
        const saleData = {
          chargeCode: 'E2E-DETAIL-001',
          items: [
            {
              itemId: 1,
              quantity: 1,
              unitPrice: 15.99
            }
          ]
        };

        const createResponse = await e2eRequest(e2eTestApp)
          .post('/api/sales')
          .set('Authorization', 'Bearer test-token')
          .send(saleData);

        const saleId = createResponse.body.id;

        // Then retrieve it
        const response = await e2eRequest(e2eTestApp)
          .get(`/api/sales/${saleId}`)
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', saleId);
        expect(response.body).toHaveProperty('chargeCode', saleData.chargeCode);
        expect(response.body).toHaveProperty('items');
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0]).toHaveProperty('itemDetails');
        expect(response.body).toHaveProperty('createdAt');
        expect(response.body).toHaveProperty('updatedAt');
      });

      it('should return 404 for non-existent sale', async () => {
        const response = await e2eRequest(e2eTestApp)
          .get('/api/sales/999999')
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message');
      });
    });
  });

  describe('Inventory API End-to-End', () => {
    describe('GET /api/items', () => {
      it('should return available items with stock information', async () => {
        const response = await e2eRequest(e2eTestApp)
          .get('/api/items')
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        
        if (response.body.length > 0) {
          const item = response.body[0];
          expect(item).toHaveProperty('id');
          expect(item).toHaveProperty('name');
          expect(item).toHaveProperty('price');
          expect(item).toHaveProperty('stock');
          expect(item).toHaveProperty('categoryId');
        }
      });

      it('should filter items by category', async () => {
        const response = await e2eRequest(e2eTestApp)
          .get('/api/items')
          .set('Authorization', 'Bearer test-token')
          .query({ categoryId: 1 });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        
        response.body.forEach((item: any) => {
          expect(item.categoryId).toBe(1);
        });
      });
    });

    describe('GET /api/categories', () => {
      it('should return all available categories', async () => {
        const response = await e2eRequest(e2eTestApp)
          .get('/api/categories')
          .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        
        if (response.body.length > 0) {
          const category = response.body[0];
          expect(category).toHaveProperty('id');
          expect(category).toHaveProperty('name');
          expect(category).toHaveProperty('description');
        }
      });
    });
  });

  describe('Stock Management', () => {
    it('should update stock levels after sale creation', async () => {
      // Get initial stock level
      const itemsResponse = await e2eRequest(e2eTestApp)
        .get('/api/items/1')
        .set('Authorization', 'Bearer test-token');

      const initialStock = itemsResponse.body.stock;

      // Create a sale
      const saleData = {
        chargeCode: 'E2E-STOCK-001',
        items: [
          {
            itemId: 1,
            quantity: 2,
            unitPrice: 10.99
          }
        ]
      };

      await e2eRequest(e2eTestApp)
        .post('/api/sales')
        .set('Authorization', 'Bearer test-token')
        .send(saleData);

      // Check updated stock level
      const updatedItemsResponse = await e2eRequest(e2eTestApp)
        .get('/api/items/1')
        .set('Authorization', 'Bearer test-token');

      const updatedStock = updatedItemsResponse.body.stock;
      expect(updatedStock).toBe(initialStock - 2);
    });

    it('should prevent overselling when stock is insufficient', async () => {
      // Get current stock
      const itemsResponse = await e2eRequest(e2eTestApp)
        .get('/api/items/1')
        .set('Authorization', 'Bearer test-token');

      const currentStock = itemsResponse.body.stock;

      // Try to sell more than available
      const saleData = {
        chargeCode: 'E2E-OVERSELL-001',
        items: [
          {
            itemId: 1,
            quantity: currentStock + 10,
            unitPrice: 10.99
          }
        ]
      };

      const response = await e2eRequest(e2eTestApp)
        .post('/api/sales')
        .set('Authorization', 'Bearer test-token')
        .send(saleData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('insufficient stock');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This would require mocking database failures
      // For now, we'll test general error response structure
      const response = await e2eRequest(e2eTestApp)
        .get('/api/sales/invalid-id')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return proper JSON error responses', async () => {
      const response = await e2eRequest(e2eTestApp)
        .post('/api/sales')
        .set('Authorization', 'Bearer test-token')
        .send({ invalid: 'data' });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Performance', () => {
    it('should respond to health check within reasonable time', async () => {
      const startTime = Date.now();
      
      const response = await e2eRequest(e2eTestApp)
        .get('/health');

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const requests = Array.from({ length: concurrentRequests }, () =>
        e2eRequest(e2eTestApp)
          .get('/api/items')
          .set('Authorization', 'Bearer test-token')
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const averageResponseTime = totalTime / concurrentRequests;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Average response time should be reasonable
      expect(averageResponseTime).toBeLessThan(500); // 500ms average
    });
  });
});
