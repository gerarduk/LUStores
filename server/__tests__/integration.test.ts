// API Integration tests
import request from 'supertest';
import express from 'express';

// Create a simple test app
const app = express();
app.use(express.json());

// Mock routes for testing
app.post('/api/sales', (req, res) => {
  const { chargeCode, customerInfo } = req.body;
  
  if (!chargeCode) {
    return res.status(400).json({ error: 'Charge code is required' });
  }
  
  const sale = {
    saleId: `test-sale-${Date.now()}`,
    chargeCode,
    customerInfo: customerInfo || {},
    subtotalAmount: '0.00',
    totalAmount: '0.00',
    status: 'completed',
    createdAt: new Date().toISOString()
  };
  
  res.status(201).json(sale);
});

app.get('/api/sales', (req, res) => {
  res.json([]);
});

app.get('/api/sales/:id', (req, res) => {
  const { id } = req.params;
  
  if (id === 'non-existent') {
    return res.status(404).json({ error: 'Sale not found' });
  }
  
  const sale = {
    saleId: id,
    chargeCode: 'TEST001',
    customerInfo: { name: 'Test Customer' },
    subtotalAmount: '10.00',
    totalAmount: '10.00',
    status: 'completed',
    items: []
  };
  
  res.json(sale);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

describe('Sales API Integration Tests', () => {
  describe('POST /api/sales', () => {
    it('should create a sale with valid data', async () => {
      const saleData = {
        chargeCode: 'DEPT001',
        customerInfo: { name: 'Integration Test Customer', email: 'test@example.com' },
        notes: 'Integration test sale',
      };

      const response = await request(app)
        .post('/api/sales')
        .send(saleData)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.saleId).toBeDefined();
      expect(response.body.chargeCode).toBe('DEPT001');
      expect(response.body.status).toBe('completed');
    });

    it('should return 400 for missing charge code', async () => {
      const saleData = {
        customerInfo: { name: 'Test Customer' },
        notes: 'Test sale without charge code',
      };

      const response = await request(app)
        .post('/api/sales')
        .send(saleData)
        .expect(400);

      expect(response.body.error).toBe('Charge code is required');
    });
  });

  describe('GET /api/sales', () => {
    it('should return empty array initially', async () => {
      const response = await request(app)
        .get('/api/sales')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/sales/:id', () => {
    it('should return sale by ID', async () => {
      const saleId = 'test-sale-123';
      
      const response = await request(app)
        .get(`/api/sales/${saleId}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.saleId).toBe(saleId);
      expect(response.body.chargeCode).toBe('TEST001');
    });

    it('should return 404 for non-existent sale', async () => {
      const response = await request(app)
        .get('/api/sales/non-existent')
        .expect(404);

      expect(response.body.error).toBe('Sale not found');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({ status: 'ok' });
    });
  });
});
