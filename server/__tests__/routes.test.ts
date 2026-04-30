import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { registerRoutes } from '../routes';
import { storage } from '../storage';
import { DatabaseTestHelper } from './helpers/databaseTestHelper';
import type { User, Category, Item } from '../../shared/schema';

// Define interfaces for mock data

interface MockUpdateItemData {
  name?: string;
  description?: string;
  price?: string;
  [key: string]: unknown;
}

interface RouteInfo {
  path: string;
  methods: string[];
}

interface RouteLayer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
  };
}

interface DashboardItem {
  id: number;
  name: string;
  sku: string;
  currentStock: number;
  minimumStock: number;
  price: string;
}

interface CategoryStat {
  category: {
    id: number;
    name: string;
    [key: string]: any;
  };
  itemCount: number;
  totalValue: number;
}

interface MockCreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  password?: string;
}

interface RequestWithUser extends Request {
  user?: { id: string; claims: { sub: string } };
}

// Mock the authentication modules
jest.mock('../localAuth', () => ({
  setupLocalAuth: jest.fn(),
  requireAuth: (req: Request, res: Response, next: NextFunction) => {
    // Mock user for testing
    (req as RequestWithUser).user = { id: 'dev_admin_001', claims: { sub: 'dev_admin_001' } };
    next();
  },
  requireRole: (_roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
    next();
  },
  createUser: jest.fn().mockImplementation(async (userData: unknown) => {
    const user = userData as MockCreateUserData;
    return {
      id: 'mock-user-' + Date.now(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role || 'user',
      isActive: true,
      mustChangePassword: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }),
  changeUserPassword: jest.fn(),
  resetUserPassword: jest.fn().mockImplementation(async () => 'temp-password-123')
}));

jest.mock('../universitySso', () => ({
  setupUniversitySso: jest.fn(),
  requireAuth: (req: Request, res: Response, next: NextFunction) => {
    (req as RequestWithUser).user = { id: 'test-user', claims: { sub: 'test-user' } };
    next();
  },
  requireRole: (_roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
    next();
  }
}));

jest.mock('../permissions', () => ({
  checkPermission: jest.fn(),
  requirePermission: (_permission: string) => (req: Request, res: Response, next: NextFunction) => {
    next();
  },
  getUserPermissions: jest.fn(),
  updateUserPermission: jest.fn(),
  getSystemSettings: jest.fn(),
  updateSystemSetting: jest.fn()
}));

jest.mock('../dbInit', () => ({
  initializeDatabase: jest.fn()
}));

jest.mock('../invoiceParser', () => ({
  parseInvoicePdf: jest.fn(),
  validateParsedInvoice: jest.fn()
}));

describe('Routes Module', () => {
  let app: express.Express;
  let dbHelper: DatabaseTestHelper;
  let server: { close?: () => void } | null;

  beforeEach(async () => {
    dbHelper = new DatabaseTestHelper();
    await dbHelper.setup();
    
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Register routes
    server = await registerRoutes(app);
  });

  afterEach(async () => {
    if (server && server.close) {
      server.close();
    }
    await dbHelper.cleanup();
    await dbHelper.close();
    jest.clearAllMocks();
  });

  describe('User Management Routes', () => {
    beforeEach(async () => {
      // Mock storage methods for user role update tests
      jest.spyOn(storage, 'getUser').mockImplementation(async (id: string) => {
        if (id.startsWith('mock-user-')) {
          return {
            id,
            email: 'test@university.edu',
            firstName: 'Test',
            lastName: 'User',
            role: 'user',
            isActive: true,
            mustChangePassword: false,
            createdAt: new Date(),
            updatedAt: new Date()
          } as User;
        }
        return null;
      });
      
      jest.spyOn(storage, 'updateUserRole').mockImplementation(async (id: string, role: string) => {
        return {
          id,
          email: 'test@university.edu',
          firstName: 'Test',
          lastName: 'User',
          role,
          isActive: true,
          mustChangePassword: false,
          createdAt: new Date(),
          updatedAt: new Date()
        } as User;
      });
      
      jest.spyOn(storage, 'updateItem').mockImplementation(async (id: number, updateData: MockUpdateItemData, updatedBy: string | null) => {
        return {
          id,
          name: updateData.name || 'Test Item',
          sku: 'TEST-001',
          description: updateData.description || 'Test description',
          categoryId: 1,
          price: updateData.price || '10.00',
          vatRate: '20.00',
          vatIncluded: false,
          currentStock: 10,
          minimumStock: 5,
          isActive: true,
          createdBy: null,
          updatedBy: updatedBy,
          createdAt: new Date(),
          updatedAt: new Date()
        } as Item;
      });

      // Create test user using direct database insert to avoid upsert constraint issues
      try {
        await storage.createLocalUser({
          email: 'test@university.edu',
          password_hash: 'test-password-hash',
          firstName: 'Test',
          lastName: 'User',
          role: 'admin',
          isActive: true,
          mustChangePassword: false
        });
      } catch (error) {
        // User might already exist, ignore duplicate errors
        console.log('Test user already exists or creation failed:', error);
      }
    });

    it('should get all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('email');
      expect(response.body[0]).toHaveProperty('firstName');
      expect(response.body[0]).toHaveProperty('lastName');
    });

    it('should create a new user', async () => {
      const newUserData = {
        email: 'newuser@university.edu',
        password: 'testPassword123',
        firstName: 'New',
        lastName: 'User',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/users')
        .send(newUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(newUserData.email);
      expect(response.body.user.firstName).toBe(newUserData.firstName);
      expect(response.body.user.role).toBe(newUserData.role);
    });

    it('should update user role', async () => {
      // First create a user to update
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          email: 'roletest@university.edu',
          password: 'testPassword123',
          firstName: 'Role',
          lastName: 'Test',
          role: 'user'
        })
        .expect(201);

      const userId = createResponse.body.user.id;

      // Then update the user's role
      const response = await request(app)
        .put(`/api/users/${userId}/role`)
        .send({ role: 'superuser' })
        .expect(200);

      expect(response.body.role).toBe('superuser');
    });

    it('should reset user password', async () => {
      const response = await request(app)
        .post('/api/users/reset-password')
        .send({ userId: 'test-user' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.temporaryPassword).toBeDefined();
    });

    it('should reset password via PATCH endpoint and not log it', async () => {
      // First create a user to reset password for
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          email: 'patchtest@university.edu',
          password: 'testPassword123',
          firstName: 'Patch',
          lastName: 'Test',
          role: 'user'
        })
        .expect(201);

      const userId = createResponse.body.user.id;

      // Spy on console.log to ensure the temporary password is not logged
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      // Then reset the user's password via PATCH
      const res = await request(app)
        .patch(`/api/users/${userId}/reset-password`)
        .expect(200);

      expect(res.body.temporaryPassword).toBeDefined();
      expect(typeof res.body.temporaryPassword).toBe('string');
      expect(res.body.temporaryPassword.length).toBeGreaterThanOrEqual(8);

      // Ensure the exact temporary password was NOT printed to the console logs
      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining(res.body.temporaryPassword));

      logSpy.mockRestore();
    });

    it('should delete/deactivate user', async () => {
      // First create a user to delete
      const createResponse = await request(app)
        .post('/api/users')
        .send({
          email: 'deletetest@university.edu',
          password: 'testPassword123',
          firstName: 'Delete',
          lastName: 'Test',
          role: 'user'
        })
        .expect(201);

      const userId = createResponse.body.user.id;

      // Then delete the user
      await request(app)
        .delete(`/api/users/${userId}`)
        .expect(204);

      // 204 No Content responses typically have empty bodies
      // The successful status code indicates the operation was successful
    });

    it('should handle user not found for password reset', async () => {
      const response = await request(app)
        .patch('/api/users/non-existent-user/reset-password')
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should handle missing userId in reset password POST', async () => {
      const response = await request(app)
        .post('/api/users/reset-password')
        .send({})
        .expect(400);

      expect(response.body.message).toContain('required');
    });
  });

  describe('Category Routes', () => {
    it('should get all categories', async () => {
      // Create test category with unique name
      await storage.createCategory({
        name: `Test Category ${Date.now()}`,
        description: 'A test category',
        icon: 'fas fa-test',
        color: '#123456',
      });

      const response = await request(app)
        .get('/api/categories')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should create a new category', async () => {
      const newCategory = {
        name: 'New Test Category',
        description: 'A new test category',
        icon: 'fas fa-new',
        color: '#654321'
      };

      const response = await request(app)
        .post('/api/categories')
        .send(newCategory)
        .expect(201);

      expect(response.body.name).toBe(newCategory.name);
      expect(response.body.description).toBe(newCategory.description);
    });

    it('should update a category', async () => {
      const category = await storage.createCategory({
        name: `Category to Update ${Date.now()}`,
        description: 'Original description',
        icon: 'fas fa-original',
        color: '#111111',

      });

      const updatedData = {
        name: 'Updated Category',
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/categories/${category.id}`)
        .send(updatedData)
        .expect(200);

      expect(response.body.name).toBe(updatedData.name);
      expect(response.body.description).toBe(updatedData.description);
    });

    it('should delete a category', async () => {
      const category = await storage.createCategory({
        name: 'Category to Delete',
        description: 'Will be deleted',
        icon: 'fas fa-delete',
        color: '#999999',

      });

      const response = await request(app)
        .delete(`/api/categories/${category.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Item Routes', () => {
    let testCategory: Category;

    beforeEach(async () => {
      testCategory = await storage.createCategory({
        name: `Items-Test-Category-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        description: 'Category for item tests',
        icon: 'fas fa-items',
        color: '#456789',

      });
    });

    it('should get all items', async () => {
      // Create test item
      await storage.createItem({
        name: 'Test Item',
        description: 'A test item',
        sku: `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
        categoryId: testCategory.id,
        price: '10.00',
        vatRate: '0.2000',
        vatIncluded: true,
        currentStock: 100,
        minimumStock: 10,
        isActive: true,
        createdBy: 'dev_admin_001'
      });

      const response = await request(app)
        .get('/api/items')
        .expect(200);

      expect(response.body.items).toBeDefined();
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.total).toBeDefined();
    });

    it('should get items with pagination', async () => {
      const response = await request(app)
        .get('/api/items?page=1&limit=10')
        .expect(200);

      expect(response.body.items).toBeDefined();
      expect(response.body.total).toBeDefined();
    });

    it('should get items with search', async () => {
      await storage.createItem({
        name: 'Searchable Item',
        description: 'An item for search testing',
        sku: `SEARCH-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
        categoryId: testCategory.id,
        price: '5.00',
        vatRate: '0.2000',
        vatIncluded: true,
        currentStock: 50,
        minimumStock: 5,
        isActive: true,
        createdBy: 'dev_admin_001'
      });

      const response = await request(app)
        .get('/api/items?search=Searchable')
        .expect(200);

      expect(response.body.items.length).toBeGreaterThan(0);
      expect(response.body.items[0].name).toContain('Searchable');
    });

    it('should create a new item', async () => {
      const newItem = {
        name: 'New Test Item',
        description: 'A new test item',
        sku: `NEW-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
        categoryId: testCategory.id,
        price: '12.00',
        vatRate: '0.2000',
        vatIncluded: true,
        currentStock: 75,
        minimumStock: 15,
        isActive: true
      };

      const response = await request(app)
        .post('/api/items')
        .send(newItem)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.item.name).toBe(newItem.name);
      expect(response.body.item.sku).toBe(newItem.sku);
    });

    it('should get a specific item', async () => {
      const item = await storage.createItem({
        name: 'Specific Item',
        description: 'A specific test item',
        sku: `SPECIFIC-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
        categoryId: testCategory.id,
        price: '7.00',
        vatRate: '0.2000',
        vatIncluded: true,
        currentStock: 25,
        minimumStock: 5,
        isActive: true,
        createdBy: 'dev_admin_001'
      });

      const response = await request(app)
        .get(`/api/items/${item.id}`)
        .expect(200);

      expect(response.body.id).toBe(item.id);
      expect(response.body.name).toBe('Specific Item');
    });

    it('should update an item', async () => {
      const item = await storage.createItem({
        name: 'Item to Update',
        description: 'Original description',
        sku: `UPDATE-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
        categoryId: testCategory.id,
        price: '6.00',
        vatRate: '0.2000',
        vatIncluded: true,
        currentStock: 40,
        minimumStock: 8,
        isActive: true,
        createdBy: 'dev_admin_001'
      });

      const updatedData = {
        name: 'Updated Item',
        description: 'Updated description',
        price: '12.00'
      };

      const response = await request(app)
        .put(`/api/items/${item.id}`)
        .send(updatedData)
        .expect(200);

      expect(response.body.name).toBe(updatedData.name);
      expect(response.body.price).toBe(updatedData.price);
    });

    it('should delete an item', async () => {
      const item = await storage.createItem({
        name: 'Item to Delete',
        description: 'Will be deleted',
        sku: `DELETE-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
        categoryId: testCategory.id,
        price: '4.00',
        vatRate: '0.2000',
        vatIncluded: true,
        currentStock: 20,
        minimumStock: 2,
        isActive: true,
        createdBy: 'dev_admin_001'
      });

      const response = await request(app)
        .delete(`/api/items/${item.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Stock Management Routes', () => {
    let testItem: Item;

    beforeEach(async () => {
      const category = await storage.createCategory({
        name: `Stock-Test-Category-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        description: 'Category for stock tests',
        icon: 'fas fa-stock',
        color: '#789abc',

      });

      testItem = await storage.createItem({
        name: 'Stock Test Item',
        description: 'Item for stock testing',
        sku: `STOCK-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
        categoryId: category.id,
        price: '8.00',
        vatRate: '0.2000',
        vatIncluded: true,
        currentStock: 100,
        minimumStock: 10,
        isActive: true,
        createdBy: 'dev_admin_001'
      });
    });

    it('should update item stock', async () => {
      const stockUpdate = {
        quantity: 50,
        type: 'in',
        reason: 'Received shipment'
      };

      const response = await request(app)
        .post(`/api/items/${testItem.id}/stock`)
        .send(stockUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should get stock movements', async () => {
      // First create a stock movement
      await storage.updateStock(testItem.id, 25, 'out', 'Sale', 'dev_admin_001');

      const response = await request(app)
        .get(`/api/items/${testItem.id}/stock-movements`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get all stock movements', async () => {
      const response = await request(app)
        .get('/api/stock-movements')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Sales Routes', () => {
    let testItem: Item;
    let testCategory: Category;
    let testCategoryName: string;
    let testChargeCodeName: string;

    beforeAll(async () => {
      // Generate a unique category name and charge code for this test run
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substr(2, 9);
      testCategoryName = `Sales-Category-${timestamp}-${randomSuffix}`;
      testChargeCodeName = `TEST-${timestamp}-${randomSuffix}`;
      
      // Create a unique category once for all tests in this describe block
      testCategory = await storage.createCategory({
        name: testCategoryName,
        description: `Category for sales tests - ${timestamp}`,
        icon: 'fas fa-sales',
        color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
      });
      
      // console.log(`Created sales test category: ${testCategoryName}`);

      // Create a test charge code with minimal required fields
      await storage.createChargeCode({
        code: testChargeCodeName,
        title: `Test charge code ${timestamp}`,
        authorisedBy: 'dev_admin_001'
      });
      
      // console.log(`Created sales test charge code: ${testChargeCodeName}`);

      // Create a test item
      testItem = await storage.createItem({
        name: `Sales Test Item ${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        description: 'Item for sales testing',
        sku: `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        categoryId: testCategory.id,
        price: '10.00',
        vatRate: '0.2000',
        vatIncluded: true,
        currentStock: 50,
        minimumStock: 5,
        isActive: true,
        createdBy: 'admin_001'
      });
    });

    afterAll(async () => {
      // Clean up any test data if needed
      if (testItem) {
        await storage.deleteItem(testItem.id);
      }
    });

    it('should create a sale', async () => {
      const saleData = {
        chargeCode: testChargeCodeName,
        customerNotes: 'Test Customer - test@example.com - Test sale',
        items: [{
          itemId: testItem.id,
          itemName: testItem.name,
          itemSku: testItem.sku || 'TEST-SKU',
          quantity: 1,
          unitPrice: 15.00
        }]
      };

      const response = await request(app)
        .post('/api/sales')
        .send(saleData)
        .expect(201);

      expect(response.body.sale.chargeCode).toBe(saleData.chargeCode);
      expect(response.body.success).toBe(true);
    });

    it('should get all sales', async () => {
      const response = await request(app)
        .get('/api/sales')
        .expect(200);

      expect(response.body.sales).toBeDefined();
      expect(Array.isArray(response.body.sales)).toBe(true);
      expect(response.body.total).toBeDefined();
    });

    it('should get sales with filters', async () => {
      const response = await request(app)
        .get('/api/sales?chargeCode=TEST-CHARGE&page=1&limit=10')
        .expect(200);

      expect(response.body.sales).toBeDefined();
      expect(response.body.total).toBeDefined();
    });

    it('should mark sale as paid', async () => {
      // First create a sale using the API
      const saleData = {
        chargeCode: testChargeCodeName,
        customerNotes: 'Payment Test Customer - payment@test.com',
        items: [{
          itemId: testItem.id,
          itemName: testItem.name,
          itemSku: testItem.sku || 'TEST-SKU',
          quantity: 2,
          unitPrice: 15.00
        }]
      };

      const createResponse = await request(app)
        .post('/api/sales')
        .send(saleData)
        .expect(201);

      const sale = createResponse.body.sale;

      const response = await request(app)
        .patch(`/api/sales/${sale.id}/paid`)
        .expect(200);

      expect(response.body.isPaid).toBe(true);
    });
  });

  describe('Dashboard Routes', () => {
    let testCategory: Category;
    let testItem: Item;
    let testData: { categoryId: number; itemId: number } | null = null;
    let testCategoryName: string;
    let testCategoryId: number;
    
    // Helper function to log registered routes for debugging
    const logRegisteredRoutes = (app: express.Express) => {
      const routes: string[] = [];
       
      (app as any)._router.stack.forEach((middleware: any) => {
        if (middleware.route) {
          // Routes registered directly on the app
          routes.push(`${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
        } else if (middleware.name === 'router') {
          // Routes registered via router
           
          middleware.handle.stack.forEach((handler: any) => {
            if (handler.route) {
              routes.push(`${Object.keys(handler.route.methods).join(', ').toUpperCase()} ${handler.route.path}`);
            }
          });
        }
      });
      // console.log('Registered routes:', routes);
    };
    
    // Helper function to generate a unique name with timestamp and random suffix
    const generateUniqueName = (prefix: string) => {
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substr(2, 9);
      return `${prefix}-${timestamp}-${randomSuffix}`;
    };

    beforeAll(async () => {
      try {
        // Generate a unique category name for this test run
        testCategoryName = generateUniqueName('Dashboard-Category');
        
        // Create a unique test data set once for all tests
        testCategory = await storage.createCategory({
          name: testCategoryName,
          description: `Dashboard test category ${testCategoryName}`,
          icon: 'fas fa-dashboard',
          color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
        });
        
        // console.log(`Created dashboard test category: ${testCategoryName}`);

        testItem = await storage.createItem({
          name: generateUniqueName('Dashboard-Item'),
          description: 'Item for dashboard testing',
          sku: `DASH-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          categoryId: testCategory.id,
          price: '5.00', // Price must be a string
          currentStock: 3, // Low stock
          minimumStock: 10,
          unitPrice: 5.00, // Ensure unitPrice is a number
          maxStockLevel: 100, // Add required field
          location: 'A1', // Add required field
          isActive: true, // Add required field
          createdBy: null // Use null to avoid FK constraint violation
        } as any); // Using type assertion to bypass type checking for test data

        testData = {
          categoryId: testCategory.id,
          itemId: testItem.id
        };
        
        // Store the category ID for cleanup
        testCategoryId = testCategory.id;
        
        // // Log the created test data for debugging
        // console.log('Created test category:', testCategory);
        // console.log('Created test item:', testItem);
        
        // Log all routes for debugging
        logRegisteredRoutes(app);
      } catch (error) {
        console.error('Error in beforeAll:', error);
        throw error;
      }
    });

    afterAll(async () => {
      // Clean up test data
      try {
        if (testData) {
          try {
            await storage.deleteItem(testData.itemId);
            // console.log('Cleaned up test item:', testData.itemId);
          } catch (error) {
            console.error('Error cleaning up test item:', error);
          }
        }
        
        if (testCategoryId) {
          try {
            await storage.deleteCategory(testCategoryId);
            // console.log('Cleaned up test category:', testCategoryId);
          } catch (error) {
            console.error('Error cleaning up test category:', error);
          }
        }
      } catch (error) {
        console.error('Error in afterAll cleanup:', error);
      }
    });

    it('should register dashboard routes', () => {
      // Check if dashboard routes are registered
       
      const routes: RouteInfo[] = (app as any)._router.stack
        .filter((layer: RouteLayer) => layer.route)
        .map((layer: RouteLayer) => ({
          path: layer.route!.path,
          methods: Object.keys(layer.route!.methods).filter(method => layer.route!.methods[method])
        }));
      
      // Check for dashboard routes
      const dashboardRoutes = routes.filter((route: RouteInfo) => 
        route.path.startsWith('/api/dashboard')
      );
      
      // Expect at least one dashboard route to be registered
      expect(dashboardRoutes.length).toBeGreaterThan(0);
    });

    it('should get dashboard stats', async () => {
      if (!testData) {
        throw new Error('Test data not initialized');
      }

      try {
        // Make the request with detailed logging
        // console.log('Making request to /api/dashboard/stats');
        const response = await request(app)
          .get('/api/dashboard/stats')
          .expect(200);

        // console.log('Response status:', response.status);
        // console.log('Response body:', response.body);

        // Verify the response structure
        expect(response.body).toMatchObject({
          totalItems: expect.any(Number),
          lowStockItems: expect.any(Number),
          totalValue: expect.any(Number),
          activeUsers: expect.any(Number)
        });
        
        // Verify we have at least our test item
        expect(response.body.totalItems).toBeGreaterThanOrEqual(1);
      } catch (error) {
        // If we get a 404, log all routes for debugging
        if (error.message.includes('expected 200 "OK", got 404')) {
          console.error('Route not found. Available routes:');
          logRegisteredRoutes(app);
        }
        console.error('Test failed with error:', error);
        throw error;
      }
    });

    it('should get low stock items', async () => {
      if (!testData) {
        throw new Error('Test data not initialized');
      }

      const response = await request(app)
        .get('/api/dashboard/low-stock')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // Our test item should be in the low stock list
      const hasTestItem = response.body.some((item: DashboardItem) => item.id === testData?.itemId);
      expect(hasTestItem).toBe(true);
      
      // Verify item structure
      const testItem = response.body.find((item: DashboardItem) => item.id === testData?.itemId);
      expect(testItem).toMatchObject({
        id: testData.itemId,
        name: expect.any(String),
        sku: expect.any(String),
        currentStock: 3,
        minimumStock: 10,
        price: expect.any(String),
        categoryId: testData.categoryId
      });
    });

    it('should get category stats', async () => {
      if (!testData) {
        throw new Error('Test data not initialized');
      }

      const response = await request(app)
        .get('/api/dashboard/category-stats')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // Our test category should be in the stats
      const categoryStat = response.body.find((stat: CategoryStat) => stat.category?.id === testData?.categoryId);
      expect(categoryStat).toBeDefined();
      
      // Verify category stats structure
      expect(categoryStat).toMatchObject({
        category: expect.objectContaining({
          id: testData.categoryId,
          name: expect.any(String)
        }),
        itemCount: expect.any(Number),
        totalValue: expect.any(Number)
      });
      
      // Should have at least our test item
      expect(categoryStat.itemCount).toBeGreaterThanOrEqual(1);
    });  
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent user', async () => {
      const response = await request(app)
        .patch('/api/users/non-existent-user/reset-password')
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should handle 404 for non-existent item', async () => {
      const response = await request(app)
        .get('/api/items/999999')
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should handle validation errors in user creation', async () => {
      const invalidUserData = {
        // Missing required fields
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/users')
        .send(invalidUserData)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should handle validation errors in item creation', async () => {
      const invalidItemData = {
        // Missing required fields
        name: 'Test Item'
      };

      const response = await request(app)
        .post('/api/items')
        .send(invalidItemData)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('File Upload Routes', () => {
    it('should handle PDF invoice upload', async () => {
      // Create a mock PDF buffer
      const mockPdfBuffer = Buffer.from('Mock PDF content');

      const response = await request(app)
        .post('/api/upload/invoice')
        .attach('invoice', mockPdfBuffer, 'test-invoice.pdf')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should reject non-PDF files', async () => {
      const mockTextBuffer = Buffer.from('Mock text content');

      const response = await request(app)
        .post('/api/upload/invoice')
        .attach('invoice', mockTextBuffer, 'test-file.txt')
        .expect(400);

      expect(response.body.message).toContain('PDF');
    });
  });

  describe('Health Check Routes', () => {
    it('should respond to health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should respond to API health check', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });
});
