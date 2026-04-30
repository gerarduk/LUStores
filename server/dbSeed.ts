import { db } from "./dbConfig";
import { categories, users, items } from "../shared/schema";
import { eq } from "drizzle-orm";

// Helper function to retry database operations with exponential backoff
const retryDatabaseOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a connection error that we should retry
      if (error instanceof Error && 
          (error.message.includes('EAI_AGAIN') || 
           error.message.includes('ECONNREFUSED') ||
           error.message.includes('getaddrinfo'))) {
        
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
          console.log(`Database seeding operation failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // For non-connection errors or if we've exhausted retries, throw immediately
      throw error;
    }
  }
  
  throw lastError!;
};

/**
 * Seeds the database with initial data if it doesn't exist
 */
export async function seedDatabase() {
  try {
    // Check database connectivity first
    try {
      await retryDatabaseOperation(() => db.execute('SELECT 1'));
      console.log('🌱 Database connection verified');
    } catch (dbError) {
      console.log('🌱 Database not available, skipping seeding:', dbError.message);
      console.log('🌱 To start the database, run: docker-compose up db');
      return;
    }

    // Check if we're in production environment
    const isProduction = process.env.NODE_ENV === 'production';
    console.log(`🌱 Database seeding started (Environment: ${process.env.NODE_ENV || 'development'})`);
    
    // Seed default categories
    const defaultCategories = [
      {
        name: "IT Equipment", 
        description: "Computers, laptops, and technology devices", 
        icon: "fas fa-laptop", 
        color: "#3b82f6"
      },
      {
        name: "Office Supplies", 
        description: "Pens, paper, and general office materials", 
        icon: "fas fa-paperclip", 
        color: "#10b981"
      },
      {
        name: "Laboratory Equipment", 
        description: "Scientific instruments and lab supplies", 
        icon: "fas fa-flask", 
        color: "#8b5cf6"
      },
      {
        name: "Furniture", 
        description: "Desks, chairs, and office furniture", 
        icon: "fas fa-chair", 
        color: "#f59e0b"
      },
      {
        name: "Medical Supplies", 
        description: "Medical devices and healthcare supplies", 
        icon: "fas fa-stethoscope", 
        color: "#ef4444"
      }
    ];

    for (const category of defaultCategories) {
      const existing = await retryDatabaseOperation(() => db.select().from(categories).where(eq(categories.name, category.name)).limit(1));
      
      if (existing.length === 0) {
        await retryDatabaseOperation(() => db.insert(categories).values(category));
      } else {
        console.log(`🌱 Category already exists: ${category.name}`);
      }
    }

    // Check if admin user with admin@university.edu email exists and ensure it has the standard ID
    const adminEmail = "admin@university.edu";
    const standardAdminId = "admin_001";
    
    // First check if the standard admin_001 user exists
    const existingStandardAdmin = await retryDatabaseOperation(() => db.select().from(users).where(eq(users.id, standardAdminId)).limit(1));
    
    let adminUserId = null;
    
    if (existingStandardAdmin.length === 0) {
      // Check if there's an admin user with the same email but different ID
      const existingAdminWithEmail = await retryDatabaseOperation(() => db.select().from(users).where(eq(users.email, adminEmail)).limit(1));
      
      if (existingAdminWithEmail.length > 0) {
        // Delete the old admin user with different ID
        console.log(`🌱 Removing old admin user with ID: ${existingAdminWithEmail[0].id} to standardize to ${standardAdminId}`);
        await retryDatabaseOperation(() => db.delete(users).where(eq(users.id, existingAdminWithEmail[0].id)));
      }
      
      // Create the specific admin_001 user needed for test items
      const newAdmin = await retryDatabaseOperation(() => (
        db.insert(users).values({
          id: standardAdminId,
          email: adminEmail,
          firstName: "Admin",
          lastName: "University",
          role: "admin",
          isActive: true,
          password_hash: "$2b$12$O.xpd3Qc7uRGRBfBA.lBS.PoJdCKIRztlp9nzbtZ/o00m5MhJ6eGi", // admin123
          mustChangePassword: false
        }).returning({ id: users.id })
      ));
      adminUserId = newAdmin[0].id;
      console.log(`🌱 Created standardized admin user: ${adminUserId}`);
      
    } else {
      adminUserId = existingStandardAdmin[0].id;
      console.log(`ℹ️ Standard admin user already exists, using ID: ${adminUserId}`);
    }

    // Skip test items in production environment
    if (isProduction) {
      console.log(`🚫 Skipping test items creation in production environment`);
      console.log(`🌱 Database seeding completed for production - categories and admin user only`);
      return;
    }

    console.log(`🧪 Creating test items for non-production environment`);

    // Seed test items for E2E tests - expanded set for reliable testing
    const testItems = [
      {
        name: "Workflow Test Item",
        description: "Test item for E2E workflow testing",
        sku: "WF-TEST-001",
        price: "25.99",
        currentStock: 100,
        minimumStock: 10,
        categoryId: null, // Will be set after finding category
        vatRate: "0.2000",
        vatIncluded: true,
        isActive: true
      },
      {
        name: "E2E Test Laptop",
        description: "Laptop for end-to-end testing",
        sku: "E2E-LAPTOP-001",
        price: "899.99",
        currentStock: 50,
        minimumStock: 5,
        categoryId: null, // Will be set after finding category
        vatRate: "0.2000",
        vatIncluded: true,
        isActive: true
      },
      {
        name: "Test Office Chair",
        description: "Office chair for testing purposes",
        sku: "TEST-CHAIR-001",
        price: "149.99",
        currentStock: 25,
        minimumStock: 3,
        categoryId: null, // Will be set after finding category
        vatRate: "0.2000",
        vatIncluded: true,
        isActive: true
      },
      {
        name: "SessionID Test Item",
        description: "Dedicated item for sessionID-based quote testing",
        sku: "SESSIONID-001",
        price: "75.50",
        currentStock: 200,
        minimumStock: 20,
        categoryId: null, // Will be set after finding category
        vatRate: "0.2000",
        vatIncluded: true,
        isActive: true
      },
      {
        name: "Multi-Test Product A",
        description: "Product A for multi-item testing scenarios",
        sku: "MULTI-A-001",
        price: "45.00",
        currentStock: 150,
        minimumStock: 15,
        categoryId: null, // Will be set after finding category
        vatRate: "0.2000",
        vatIncluded: true,
        isActive: true
      },
      {
        name: "Multi-Test Product B",
        description: "Product B for multi-item testing scenarios",
        sku: "MULTI-B-001",
        price: "67.25",
        currentStock: 120,
        minimumStock: 12,
        categoryId: null, // Will be set after finding category
        vatRate: "0.2000",
        vatIncluded: true,
        isActive: true
      }
    ];

    // Get category IDs for test items - ensure they exist
    const itCategory = await retryDatabaseOperation(() => db.select().from(categories).where(eq(categories.name, "IT Equipment")).limit(1));
    const furnitureCategory = await retryDatabaseOperation(() => db.select().from(categories).where(eq(categories.name, "Furniture")).limit(1));
    const officeCategory = await retryDatabaseOperation(() => db.select().from(categories).where(eq(categories.name, "Office Supplies")).limit(1));

    // Ensure we have at least one category for fallback
    let fallbackCategoryId = null;
    if (itCategory.length > 0) {
      fallbackCategoryId = itCategory[0].id;
    } else if (officeCategory.length > 0) {
      fallbackCategoryId = officeCategory[0].id;
    } else if (furnitureCategory.length > 0) {
      fallbackCategoryId = furnitureCategory[0].id;
    }

    if (!fallbackCategoryId) {
      console.log('❌ No categories found for test items - seeding may fail');
      throw new Error('No categories available for test items');
    }

    // Set category IDs with fallback for all test items
    testItems[0].categoryId = itCategory.length > 0 ? itCategory[0].id : fallbackCategoryId; // Workflow Test Item
    testItems[1].categoryId = itCategory.length > 0 ? itCategory[0].id : fallbackCategoryId; // E2E Test Laptop
    testItems[2].categoryId = furnitureCategory.length > 0 ? furnitureCategory[0].id : fallbackCategoryId; // Test Office Chair
    testItems[3].categoryId = itCategory.length > 0 ? itCategory[0].id : fallbackCategoryId; // SessionID Test Item
    testItems[4].categoryId = officeCategory.length > 0 ? officeCategory[0].id : fallbackCategoryId; // Multi-Test Product A
    testItems[5].categoryId = officeCategory.length > 0 ? officeCategory[0].id : fallbackCategoryId; // Multi-Test Product B
    
    console.log(`🌱 Using category IDs: IT=${itCategory[0]?.id || 'fallback'}, Furniture=${furnitureCategory[0]?.id || 'fallback'}, Fallback=${fallbackCategoryId}`);


    // Insert test items if they don't exist - with improved error handling
    console.log(`🌱 Attempting to create ${testItems.length} test items...`);
    let itemsCreated = 0;
    let itemsSkipped = 0;
    
    for (const item of testItems) {
      try {
        const existing = await retryDatabaseOperation(() => db.select().from(items).where(eq(items.sku, item.sku)).limit(1));
        
        if (existing.length === 0) {
          // Validate required fields before insertion
          if (!item.categoryId) {
            console.log(`❌ Skipping ${item.name} - missing categoryId`);
            continue;
          }
          
          const insertResult = await retryDatabaseOperation(() => (
            db.insert(items).values({
              ...item,
              createdBy: adminUserId, // Use the actual admin user ID found/created above
              createdAt: new Date(),
              updatedAt: new Date()
            }).returning({ id: items.id, name: items.name, sku: items.sku, stock: items.currentStock })
          ));
          
          console.log(`🌱 Created test item: ${item.name} (ID: ${insertResult[0].id}, Stock: ${insertResult[0].stock})`);
          itemsCreated++;
        } else {
          console.log(`🌱 Test item already exists: ${item.name} (ID: ${existing[0].id})`);
          itemsSkipped++;
        }
      } catch (error) {
        console.log(`❌ Failed to create test item ${item.name}:`, error);
        // Continue with other items instead of failing completely
      }
    }
    
    console.log(`🌱 E2E test items summary: ${itemsCreated} created, ${itemsSkipped} already existed`);
    
    // Verify we have at least some test items available
    const totalTestItems = await retryDatabaseOperation(() => db.select().from(items).where(eq(items.isActive, true)));
    console.log(`🌱 Total active items in database: ${totalTestItems.length}`);
    
    if (totalTestItems.length === 0) {
      console.log('❌ WARNING: No active items found in database - E2E tests may fail!');
    }

    console.log(`🌱 Database seeding completed for development/test environment`);

  } catch (error) {
    console.log("🌱 Error seeding database:", error);
    throw error;
  }
}