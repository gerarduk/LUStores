/**
 * Performance and Stress Tests
 * 
 * Comprehensive performance testing suite covering:
 * 1. Database performance under load
 * 2. API endpoint response times and throughput
 * 3. Large dataset handling and pagination
 * 4. Concurrent operation stress testing
 * 5. Memory usage and resource utilization
 * 6. Bulk operations performance
 * 7. Complex query optimization
 * 8. Connection pool stress testing
 * 9. Error handling under load
 * 10. Performance regression detection
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app'; // Adjust path as needed
import { testDb } from '../test-helpers/database';
import { createTestUser, authenticateUser } from '../test-helpers/auth';
import { setupTestData, cleanupTestData } from '../test-helpers/test-data';
import { DatabaseTestHelper } from '../helpers/databaseTestHelper';

interface PerformanceMetric {
  operationType: string;
  totalOperations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  operationsPerSecond: number;
  successCount: number;
  errorCount: number;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
}

interface StressTestConfig {
  concurrency: number;
  totalRequests: number;
  timeoutMs: number;
  rampUpTime: number;
}

interface LoadTestResult {
  config: StressTestConfig;
  metrics: PerformanceMetric;
  percentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
  errorsByType: Map<string, number>;
}

// Performance testing utilities
class PerformanceTestHelper {
  private static responseTimesBuffer: number[] = [];
  private static errors: { type: string; message: string; timestamp: Date }[] = [];

  static startMemoryMonitoring(): NodeJS.Timer {
    return setInterval(() => {
      if (global.gc) {
        global.gc();
      }
    }, 5000);
  }

  static stopMemoryMonitoring(monitor: NodeJS.Timer): void {
    clearInterval(monitor);
  }

  static recordResponseTime(time: number): void {
    this.responseTimesBuffer.push(time);
  }

  static recordError(type: string, message: string): void {
    this.errors.push({ type, message, timestamp: new Date() });
  }

  static calculatePercentiles(times: number[]): { p50: number; p95: number; p99: number } {
    const sorted = times.slice().sort((a, b) => a - b);
    const length = sorted.length;

    return {
      p50: sorted[Math.floor(length * 0.5)],
      p95: sorted[Math.floor(length * 0.95)],
      p99: sorted[Math.floor(length * 0.99)],
    };
  }

  static getMemoryUsage(): PerformanceMetric['memoryUsage'] {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100,
      rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100,
    };
  }

  static async runConcurrentRequests(
    requestFn: () => Promise<any>,
    config: StressTestConfig
  ): Promise<LoadTestResult> {
    const { concurrency, totalRequests, timeoutMs, rampUpTime } = config;
    
    this.responseTimesBuffer = [];
    this.errors = [];

    const results: Promise<{ success: boolean; time: number; error?: any }>[] = [];
    const startTime = Date.now();

    // Ramp up requests gradually
    const batchSize = Math.ceil(totalRequests / concurrency);
    const rampUpDelay = rampUpTime / concurrency;

    for (let batch = 0; batch < concurrency; batch++) {
      // Delay between batches for ramp up
      if (rampUpDelay > 0 && batch > 0) {
        await new Promise(resolve => setTimeout(resolve, rampUpDelay));
      }

      const batchPromises: Promise<any>[] = [];
      const requestsInBatch = Math.min(batchSize, totalRequests - (batch * batchSize));

      for (let i = 0; i < requestsInBatch; i++) {
        const requestStart = Date.now();
        
        const promise = Promise.race([
          requestFn(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
          )
        ])
        .then(() => ({
          success: true,
          time: Date.now() - requestStart
        }))
        .catch((error) => {
          this.recordError('RequestError', error.message);
          return {
            success: false,
            time: Date.now() - requestStart,
            error: error.message
          };
        });

        batchPromises.push(promise);
      }

      results.push(...batchPromises);
    }

    const completedResults = await Promise.all(results);
    const endTime = Date.now();

    // Calculate metrics
    const totalTime = endTime - startTime;
    const responseTimes = completedResults.map(r => r.time);
    const successResults = completedResults.filter(r => r.success);
    const errorResults = completedResults.filter(r => !r.success);

    const metrics: PerformanceMetric = {
      operationType: 'ConcurrentRequests',
      totalOperations: completedResults.length,
      totalTime: totalTime,
      averageTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      minTime: Math.min(...responseTimes),
      maxTime: Math.max(...responseTimes),
      operationsPerSecond: completedResults.length / (totalTime / 1000),
      successCount: successResults.length,
      errorCount: errorResults.length,
      memoryUsage: this.getMemoryUsage(),
    };

    const percentiles = this.calculatePercentiles(responseTimes);
    
    const errorsByType = new Map<string, number>();
    errorResults.forEach(result => {
      const errorType = result.error || 'Unknown';
      errorsByType.set(errorType, (errorsByType.get(errorType) || 0) + 1);
    });

    return {
      config,
      metrics,
      percentiles,
      errorsByType,
    };
  }

  static async measureOperation<T>(
    operationType: string,
    operation: () => Promise<T>
  ): Promise<{ result: T; metrics: PerformanceMetric }> {
    const startTime = Date.now();
    const startMemory = this.getMemoryUsage();

    try {
      const result = await operation();
      const endTime = Date.now();
      const operationTime = endTime - startTime;

      const metrics: PerformanceMetric = {
        operationType,
        totalOperations: 1,
        totalTime: operationTime,
        averageTime: operationTime,
        minTime: operationTime,
        maxTime: operationTime,
        operationsPerSecond: 1000 / operationTime,
        successCount: 1,
        errorCount: 0,
        memoryUsage: this.getMemoryUsage(),
      };

      return { result, metrics };
    } catch (error) {
      const endTime = Date.now();
      const operationTime = endTime - startTime;

      this.recordError(operationType, error instanceof Error ? error.message : 'Unknown error');

      const metrics: PerformanceMetric = {
        operationType,
        totalOperations: 1,
        totalTime: operationTime,
        averageTime: operationTime,
        minTime: operationTime,
        maxTime: operationTime,
        operationsPerSecond: 0,
        successCount: 0,
        errorCount: 1,
        memoryUsage: this.getMemoryUsage(),
      };

      throw { error, metrics };
    }
  }

  static clearBuffers(): void {
    this.responseTimesBuffer = [];
    this.errors = [];
  }

  static printMetrics(results: LoadTestResult): void {
    console.log(`\n📊 Load Test Results for ${results.metrics.operationType}`);
    console.log(`⚙️  Configuration: ${results.config.concurrency} concurrent, ${results.config.totalRequests} total requests`);
    console.log(`✅ Success Rate: ${((results.metrics.successCount / results.metrics.totalOperations) * 100).toFixed(2)}%`);
    console.log(`⚡ Throughput: ${results.metrics.operationsPerSecond.toFixed(2)} requests/second`);
    console.log(`⏱️  Response Times (ms):`);
    console.log(`   • Average: ${results.metrics.averageTime.toFixed(2)}`);
    console.log(`   • Min: ${results.metrics.minTime.toFixed(2)}`);
    console.log(`   • Max: ${results.metrics.maxTime.toFixed(2)}`);
    console.log(`   • 50th %ile: ${results.percentiles.p50.toFixed(2)}`);
    console.log(`   • 95th %ile: ${results.percentiles.p95.toFixed(2)}`);
    console.log(`   • 99th %ile: ${results.percentiles.p99.toFixed(2)}`);
    console.log(`💾 Memory Usage (MB):`);
    console.log(`   • Heap Used: ${results.metrics.memoryUsage?.heapUsed}`);
    console.log(`   • RSS: ${results.metrics.memoryUsage?.rss}`);
    
    if (results.errorsByType.size > 0) {
      console.log(`❌ Errors by Type:`);
      results.errorsByType.forEach((count, type) => {
        console.log(`   • ${type}: ${count}`);
      });
    }
  }
}

describe('Performance and Stress Tests', () => {
  let testHelper: DatabaseTestHelper;
  let testUser: any;
  let authHeader: Record<string, string>;
  let memoryMonitor: NodeJS.Timer;

  beforeAll(async () => {
    await testDb.connect();
    
    // Enable garbage collection for memory monitoring
    if (global.gc) {
      global.gc();
    }
  });

  afterAll(async () => {
    await testDb.disconnect();
    PerformanceTestHelper.clearBuffers();
  });

  beforeEach(async () => {
    testHelper = new DatabaseTestHelper();
    await testHelper.setup();
    await setupTestData();

    // Create test user for authentication
    testUser = await createTestUser({
      email: 'performance@test.com',
      firstName: 'Performance',
      lastName: 'User',
      role: 'admin',
      password: 'password123',
    });

    const token = await authenticateUser(testUser.email, testUser.password);
    authHeader = { Authorization: `Bearer ${token}` };

    // Start memory monitoring
    memoryMonitor = PerformanceTestHelper.startMemoryMonitoring();
    PerformanceTestHelper.clearBuffers();
  });

  afterEach(async () => {
    PerformanceTestHelper.stopMemoryMonitoring(memoryMonitor);
    await cleanupTestData();
    await testHelper.cleanup();
    await testHelper.close();
  });

  describe('API Endpoint Performance Tests', () => {

    describe('Inventory API Performance', () => {

      it('should handle high-volume inventory item creation efficiently', async () => {
        const category = await testHelper.createTestCategory({
          name: 'Performance Test Category',
        });

        const config: StressTestConfig = {
          concurrency: 10,
          totalRequests: 100,
          timeoutMs: 5000,
          rampUpTime: 1000,
        };

        let requestCounter = 0;
        const requestFn = async () => {
          const itemData = {
            name: `Performance Item ${++requestCounter}`,
            sku: `PERF-${requestCounter.toString().padStart(4, '0')}`,
            description: 'Performance testing item',
            categoryId: category.id,
            price: '99.99',
            currentStock: 100,
            minimumStock: 10,
            vatRate: 0.20,
            vatIncluded: true,
          };

          const response = await request(app)
            .post('/api/items')
            .set(authHeader)
            .send(itemData);

          if (response.status !== 201) {
            throw new Error(`Create item failed with status ${response.status}: ${response.text}`);
          }

          return response.body;
        };

        const results = await PerformanceTestHelper.runConcurrentRequests(requestFn, config);
        PerformanceTestHelper.printMetrics(results);

        // Performance assertions
        expect(results.metrics.successCount).toBeGreaterThan(config.totalRequests * 0.95); // 95% success rate
        expect(results.metrics.averageTime).toBeLessThan(1000); // Average response under 1 second
        expect(results.percentiles.p95).toBeLessThan(2000); // 95% of requests under 2 seconds
        expect(results.metrics.operationsPerSecond).toBeGreaterThan(10); // At least 10 ops/sec
      });

      it('should efficiently retrieve large inventory lists with pagination', async () => {
        // Pre-populate with large dataset
        const category = await testHelper.createTestCategory({
          name: 'Bulk Test Category',
        });

        console.log('⏳ Creating 1000 test items for pagination testing...');
        const createPromises = [];
        for (let i = 1; i <= 1000; i++) {
          createPromises.push(
            testHelper.createTestInventoryItem({
              name: `Bulk Item ${i}`,
              sku: `BULK-${i.toString().padStart(4, '0')}`,
              unitPrice: Math.random() * 100 + 10,
              vatRate: 0.20,
              category: category.name,
              currentStock: Math.floor(Math.random() * 100),
            })
          );

          // Process in batches to avoid overwhelming the system
          if (i % 100 === 0) {
            await Promise.all(createPromises.splice(0, 100));
          }
        }
        await Promise.all(createPromises);

        const config: StressTestConfig = {
          concurrency: 20,
          totalRequests: 200,
          timeoutMs: 3000,
          rampUpTime: 500,
        };

        const requestFn = async () => {
          const page = Math.floor(Math.random() * 50) + 1; // Random pages 1-50
          const limit = Math.floor(Math.random() * 50) + 10; // Random limits 10-60

          const response = await request(app)
            .get(`/api/items?page=${page}&limit=${limit}`)
            .set(authHeader);

          if (response.status !== 200) {
            throw new Error(`Get items failed with status ${response.status}`);
          }

          return response.body;
        };

        const results = await PerformanceTestHelper.runConcurrentRequests(requestFn, config);
        PerformanceTestHelper.printMetrics(results);

        expect(results.metrics.successCount).toBe(config.totalRequests);
        expect(results.metrics.averageTime).toBeLessThan(500); // Fast pagination
        expect(results.percentiles.p99).toBeLessThan(1000);
      });

      it('should handle inventory search queries efficiently', async () => {
        // Create diverse inventory for search testing
        const searchTerms = ['laptop', 'mouse', 'keyboard', 'monitor', 'cable'];
        
        for (let i = 0; i < 200; i++) {
          const term = searchTerms[i % searchTerms.length];
          await testHelper.createTestInventoryItem({
            name: `${term} ${i}`,
            sku: `SEARCH-${term.toUpperCase()}-${i}`,
            unitPrice: 50,
            vatRate: 0.20,
            category: 'Electronics',
            currentStock: 10,
          });
        }

        const config: StressTestConfig = {
          concurrency: 15,
          totalRequests: 150,
          timeoutMs: 4000,
          rampUpTime: 750,
        };

        const requestFn = async () => {
          const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
          
          const response = await request(app)
            .get(`/api/items?search=${encodeURIComponent(searchTerm)}`)
            .set(authHeader);

          if (response.status !== 200) {
            throw new Error(`Search failed with status ${response.status}`);
          }

          return response.body;
        };

        const results = await PerformanceTestHelper.runConcurrentRequests(requestFn, config);
        PerformanceTestHelper.printMetrics(results);

        expect(results.metrics.successCount).toBe(config.totalRequests);
        expect(results.metrics.averageTime).toBeLessThan(800);
        expect(results.metrics.operationsPerSecond).toBeGreaterThan(15);
      });
    });

    describe('Order Management Performance', () => {

      it('should efficiently process bulk order creation', async () => {
        const supplier = await testHelper.createTestSupplier({
          id: 'BULK-SUPPLIER',
          name: 'Bulk Order Supplier',
        });

        const config: StressTestConfig = {
          concurrency: 8,
          totalRequests: 50,
          timeoutMs: 10000, // Longer timeout for complex operations
          rampUpTime: 2000,
        };

        let orderCounter = 0;
        const requestFn = async () => {
          const orderItems = [];
          const itemCount = Math.floor(Math.random() * 20) + 5; // 5-25 items per order

          for (let i = 0; i < itemCount; i++) {
            orderItems.push({
              itemName: `Order Item ${++orderCounter}-${i}`,
              itemSku: `ORD-${orderCounter}-${i}`,
              unitCost: (Math.random() * 100 + 10).toFixed(2),
              quantity: Math.floor(Math.random() * 10) + 1,
            });
          }

          const orderData = {
            supplierId: supplier.id,
            notes: `Bulk test order ${orderCounter}`,
            items: orderItems,
          };

          const response = await request(app)
            .post('/api/orders')
            .set(authHeader)
            .send(orderData);

          if (response.status !== 201) {
            throw new Error(`Order creation failed with status ${response.status}: ${response.text}`);
          }

          return response.body;
        };

        const results = await PerformanceTestHelper.runConcurrentRequests(requestFn, config);
        PerformanceTestHelper.printMetrics(results);

        expect(results.metrics.successCount).toBeGreaterThan(config.totalRequests * 0.90);
        expect(results.metrics.averageTime).toBeLessThan(3000);
        expect(results.percentiles.p95).toBeLessThan(5000);
      });

      it('should handle concurrent order receiving efficiently', async () => {
        // Pre-create orders with items
        const supplier = await testHelper.createTestSupplier({
          id: 'RECEIVING-SUPPLIER',
          name: 'Receiving Test Supplier',
        });

        const orders = [];
        for (let i = 0; i < 25; i++) {
          const order = await testHelper.createTestOrder({
            orderId: `RECEIVE-${i.toString().padStart(3, '0')}`,
            supplierId: supplier.id,
            status: 'pending',
            createdBy: testUser.id,
          });

          const orderItem = await testHelper.createTestOrderItem({
            orderId: order.id,
            itemName: `Receive Item ${i}`,
            itemSku: `REC-${i}`,
            unitCost: '50.00',
            quantity: '10',
            totalCost: '500.00',
          });

          orders.push({ order, orderItem });
        }

        const config: StressTestConfig = {
          concurrency: 5,
          totalRequests: 25,
          timeoutMs: 8000,
          rampUpTime: 1000,
        };

        let orderIndex = 0;
        const requestFn = async () => {
          const { order, orderItem } = orders[orderIndex++];

          const receiveData = {
            receivedItems: [
              {
                orderItemId: orderItem.id,
                receivedQuantity: 10,
                addToInventory: true,
              },
            ],
          };

          const response = await request(app)
            .post(`/api/orders/${order.id}/receive`)
            .set(authHeader)
            .send(receiveData);

          if (response.status !== 200) {
            throw new Error(`Order receiving failed with status ${response.status}: ${response.text}`);
          }

          return response.body;
        };

        const results = await PerformanceTestHelper.runConcurrentRequests(requestFn, config);
        PerformanceTestHelper.printMetrics(results);

        expect(results.metrics.successCount).toBe(config.totalRequests);
        expect(results.metrics.averageTime).toBeLessThan(2000);
      });
    });

    describe('Sales Processing Performance', () => {

      it('should efficiently handle high-volume sales creation', async () => {
        // Pre-create inventory items
        const category = await testHelper.createTestCategory({
          name: 'Sales Performance Category',
        });

        const items = [];
        for (let i = 0; i < 50; i++) {
          const item = await testHelper.createTestInventoryItem({
            name: `Sale Item ${i}`,
            sku: `SALE-${i.toString().padStart(3, '0')}`,
            unitPrice: Math.random() * 100 + 20,
            vatRate: 0.20,
            category: category.name,
            currentStock: 1000, // High stock for concurrent sales
          });
          items.push(item);
        }

        const config: StressTestConfig = {
          concurrency: 12,
          totalRequests: 100,
          timeoutMs: 6000,
          rampUpTime: 1500,
        };

        const requestFn = async () => {
          const saleItems = [];
          const itemCount = Math.floor(Math.random() * 5) + 1; // 1-5 items per sale

          for (let i = 0; i < itemCount; i++) {
            const randomItem = items[Math.floor(Math.random() * items.length)];
            saleItems.push({
              itemId: randomItem.id,
              quantity: Math.floor(Math.random() * 5) + 1,
            });
          }

          const saleData = {
            items: saleItems,
            chargeCodeId: 1, // Assume test charge code exists
            deliveredTo: 'Performance Test Customer',
          };

          const response = await request(app)
            .post('/api/sales')
            .set(authHeader)
            .send(saleData);

          if (response.status !== 201) {
            throw new Error(`Sale creation failed with status ${response.status}: ${response.text}`);
          }

          return response.body;
        };

        const results = await PerformanceTestHelper.runConcurrentRequests(requestFn, config);
        PerformanceTestHelper.printMetrics(results);

        expect(results.metrics.successCount).toBeGreaterThan(config.totalRequests * 0.90);
        expect(results.metrics.operationsPerSecond).toBeGreaterThan(8);
        expect(results.percentiles.p95).toBeLessThan(4000);
      });
    });
  });

  describe('Database Performance Tests', () => {

    it('should handle large dataset queries efficiently', async () => {
      console.log('⏳ Creating large dataset for database performance testing...');
      
      // Create large dataset in batches
      const batchSize = 100;
      const totalRecords = 1000;
      
      for (let batch = 0; batch < totalRecords / batchSize; batch++) {
        const promises = [];
        
        for (let i = 0; i < batchSize; i++) {
          const recordIndex = batch * batchSize + i;
          
          promises.push(
            testHelper.createTestInventoryItem({
              name: `Large Dataset Item ${recordIndex}`,
              sku: `LARGE-${recordIndex.toString().padStart(5, '0')}`,
              unitPrice: Math.random() * 1000,
              vatRate: Math.random() > 0.5 ? 0.20 : 0.05,
              category: `Category ${Math.floor(recordIndex / 100)}`,
              currentStock: Math.floor(Math.random() * 1000),
            })
          );
        }
        
        await Promise.all(promises);
        console.log(`✅ Batch ${batch + 1}/${totalRecords / batchSize} completed`);
      }

      // Test complex queries
      const complexQueryTests = [
        {
          name: 'Full table scan with filters',
          queryFn: () => request(app)
            .get('/api/items?search=Large&category=Category 1&minPrice=100&maxPrice=900')
            .set(authHeader),
        },
        {
          name: 'Aggregation queries',
          queryFn: () => request(app)
            .get('/api/dashboard/statistics')
            .set(authHeader),
        },
        {
          name: 'Large pagination',
          queryFn: () => request(app)
            .get('/api/items?page=20&limit=50')
            .set(authHeader),
        },
      ];

      for (const test of complexQueryTests) {
        const { result, metrics } = await PerformanceTestHelper.measureOperation(
          test.name,
          test.queryFn
        );

        console.log(`📊 ${test.name}: ${metrics.averageTime.toFixed(2)}ms (${metrics.operationsPerSecond.toFixed(2)} ops/sec)`);

        expect(metrics.successCount).toBe(1);
        expect(metrics.averageTime).toBeLessThan(2000); // Complex queries under 2 seconds
      }
    });

    it('should handle database connection pool stress', async () => {
      const config: StressTestConfig = {
        concurrency: 25, // High concurrency to stress connection pool
        totalRequests: 250,
        timeoutMs: 5000,
        rampUpTime: 0, // No ramp-up to max stress immediately
      };

      const requestFn = async () => {
        // Mix of read and write operations
        const operationType = Math.random();
        
        if (operationType < 0.7) {
          // 70% read operations
          const response = await request(app)
            .get('/api/items?limit=10')
            .set(authHeader);
          
          if (response.status !== 200) {
            throw new Error(`Read operation failed: ${response.status}`);
          }
          return response.body;
        } else {
          // 30% write operations
          const itemData = {
            name: `Connection Pool Test Item ${Date.now()}`,
            sku: `POOL-${Date.now()}`,
            categoryId: 1,
            price: '25.00',
            currentStock: 10,
          };

          const response = await request(app)
            .post('/api/items')
            .set(authHeader)
            .send(itemData);

          if (response.status !== 201) {
            throw new Error(`Write operation failed: ${response.status}`);
          }
          return response.body;
        }
      };

      const results = await PerformanceTestHelper.runConcurrentRequests(requestFn, config);
      PerformanceTestHelper.printMetrics(results);

      // Connection pool should handle this stress gracefully
      expect(results.metrics.successCount).toBeGreaterThan(config.totalRequests * 0.85); // 85% success under stress
      expect(results.percentiles.p99).toBeLessThan(5000); // 99% of requests under 5 seconds even under stress
    });
  });

  describe('Memory and Resource Usage Tests', () => {

    it('should maintain stable memory usage during bulk operations', async () => {
      const initialMemory = PerformanceTestHelper.getMemoryUsage();
      console.log(`🔋 Initial Memory Usage: Heap=${initialMemory.heapUsed}MB, RSS=${initialMemory.rss}MB`);

      // Perform memory-intensive operations
      const operations = [];
      for (let i = 0; i < 500; i++) {
        operations.push(
          testHelper.createTestInventoryItem({
            name: `Memory Test Item ${i}`,
            sku: `MEM-${i}`,
            unitPrice: 50,
            vatRate: 0.20,
            category: 'Memory Test',
            currentStock: 100,
          })
        );

        // Process in batches and check memory periodically
        if (i % 100 === 0 && i > 0) {
          await Promise.all(operations.splice(0, 100));
          
          const currentMemory = PerformanceTestHelper.getMemoryUsage();
          console.log(`📊 Memory at ${i} records: Heap=${currentMemory.heapUsed}MB, RSS=${currentMemory.rss}MB`);
          
          // Memory growth should be reasonable
          const heapGrowth = currentMemory.heapUsed - initialMemory.heapUsed;
          expect(heapGrowth).toBeLessThan(200); // Less than 200MB heap growth
        }
      }

      await Promise.all(operations);

      const finalMemory = PerformanceTestHelper.getMemoryUsage();
      console.log(`🔚 Final Memory Usage: Heap=${finalMemory.heapUsed}MB, RSS=${finalMemory.rss}MB`);

      // Force garbage collection and check for memory leaks
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const postGcMemory = PerformanceTestHelper.getMemoryUsage();
        console.log(`♻️  Post-GC Memory: Heap=${postGcMemory.heapUsed}MB, RSS=${postGcMemory.rss}MB`);
        
        // Memory should have been released significantly after GC
        expect(postGcMemory.heapUsed).toBeLessThan(finalMemory.heapUsed * 1.5);
      }
    });

    it('should handle memory pressure gracefully', async () => {
      // Test with large request payloads
      const largeOrderData = {
        supplierId: 'MEMORY-PRESSURE-SUPPLIER',
        notes: 'Large order for memory pressure testing',
        items: [],
      };

      // Create order with many items
      for (let i = 0; i < 200; i++) {
        largeOrderData.items.push({
          itemName: `Large Order Item ${i}`.repeat(10), // Longer names
          itemSku: `LARGE-${i}`,
          itemDescription: 'A'.repeat(500), // Large descriptions
          unitCost: '50.00',
          quantity: 5,
        });
      }

      const { result, metrics } = await PerformanceTestHelper.measureOperation(
        'Large order creation',
        async () => {
          const response = await request(app)
            .post('/api/orders')
            .set(authHeader)
            .send(largeOrderData);

          if (response.status !== 201) {
            throw new Error(`Large order failed: ${response.status}`);
          }

          return response.body;
        }
      );

      console.log(`📦 Large order (200 items) created in ${metrics.averageTime}ms`);
      console.log(`💾 Memory after large order: ${JSON.stringify(metrics.memoryUsage, null, 2)}`);

      expect(metrics.successCount).toBe(1);
      expect(metrics.averageTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Error Handling Under Load', () => {

    it('should maintain error handling quality under stress', async () => {
      const config: StressTestConfig = {
        concurrency: 15,
        totalRequests: 100,
        timeoutMs: 3000,
        rampUpTime: 0,
      };

      // Mix of valid and invalid requests to test error handling
      const requestFn = async () => {
        const requestType = Math.random();

        if (requestType < 0.3) {
          // 30% invalid requests to test error handling
          const invalidData = {
            // Missing required fields
            name: '',
            sku: '',
            price: 'invalid',
          };

          const response = await request(app)
            .post('/api/items')
            .set(authHeader)
            .send(invalidData);

          // Error responses should still be fast and well-formed
          if (response.status < 400 || response.status >= 500) {
            throw new Error(`Expected 4xx error but got ${response.status}`);
          }

          return { error: true, status: response.status };
        } else {
          // 70% valid requests
          const validData = {
            name: `Stress Test Item ${Date.now()}`,
            sku: `STRESS-${Date.now()}`,
            categoryId: 1,
            price: '99.99',
            currentStock: 50,
          };

          const response = await request(app)
            .post('/api/items')
            .set(authHeader)
            .send(validData);

          if (response.status !== 201) {
            throw new Error(`Valid request failed: ${response.status}`);
          }

          return { error: false, status: response.status };
        }
      };

      const results = await PerformanceTestHelper.runConcurrentRequests(requestFn, config);
      PerformanceTestHelper.printMetrics(results);

      // All requests should complete (either success or proper error)
      expect(results.metrics.totalOperations).toBe(config.totalRequests);
      
      // Error responses should still be reasonably fast
      expect(results.metrics.averageTime).toBeLessThan(1000);
      
      // Should have mix of successes and proper errors
      expect(results.metrics.successCount).toBeGreaterThan(config.totalRequests * 0.6);
      expect(results.metrics.successCount).toBeLessThan(config.totalRequests * 0.8);
    });

    it('should handle authentication failures gracefully under load', async () => {
      const config: StressTestConfig = {
        concurrency: 20,
        totalRequests: 100,
        timeoutMs: 2000,
        rampUpTime: 0,
      };

      const requestFn = async () => {
        // Requests without authentication should fail quickly
        const response = await request(app)
          .get('/api/items')
          // No auth header

        if (response.status !== 401) {
          throw new Error(`Expected 401 but got ${response.status}`);
        }

        return { authenticated: false };
      };

      const results = await PerformanceTestHelper.runConcurrentRequests(requestFn, config);
      PerformanceTestHelper.printMetrics(results);

      expect(results.metrics.successCount).toBe(config.totalRequests);
      expect(results.metrics.averageTime).toBeLessThan(100); // Auth failures should be very fast
    });
  });

  describe('Performance Regression Detection', () => {

    it('should establish performance baselines for critical operations', async () => {
      const baselines = {
        itemCreation: { targetTime: 500, tolerance: 0.2 },
        itemList: { targetTime: 200, tolerance: 0.3 },
        orderCreation: { targetTime: 1000, tolerance: 0.3 },
        saleCreation: { targetTime: 800, tolerance: 0.25 },
      };

      const results: { [key: string]: PerformanceMetric } = {};

      // Test item creation
      const { metrics: itemCreationMetrics } = await PerformanceTestHelper.measureOperation(
        'Item Creation Baseline',
        async () => {
          const response = await request(app)
            .post('/api/items')
            .set(authHeader)
            .send({
              name: 'Baseline Test Item',
              sku: 'BASELINE-001',
              categoryId: 1,
              price: '50.00',
              currentStock: 100,
            });
          return response.body;
        }
      );
      results.itemCreation = itemCreationMetrics;

      // Test item list
      const { metrics: itemListMetrics } = await PerformanceTestHelper.measureOperation(
        'Item List Baseline',
        async () => {
          const response = await request(app)
            .get('/api/items?limit=20')
            .set(authHeader);
          return response.body;
        }
      );
      results.itemList = itemListMetrics;

      // Verify all operations meet baseline expectations
      Object.entries(baselines).forEach(([operation, baseline]) => {
        const metrics = results[operation];
        if (metrics) {
          const tolerance = baseline.targetTime * baseline.tolerance;
          const acceptableRange = baseline.targetTime + tolerance;

          console.log(`📊 ${operation}: ${metrics.averageTime.toFixed(2)}ms (target: ${baseline.targetTime}ms ± ${tolerance.toFixed(0)}ms)`);
          
          expect(metrics.averageTime).toBeLessThan(acceptableRange);
        }
      });
    });
  });
});