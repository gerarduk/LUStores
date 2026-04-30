import { test, expect } from '@playwright/test';

test.describe('API Inventory Loading Test', () => {
  let authToken: string;
  
  test('Verify authentication endpoint works', async ({ request }) => {
    console.log('Testing authentication endpoint...');
    
    const response = await request.post('http://localhost:5000/auth/login', {
      data: {
        email: 'admin@university.edu',
        password: 'admin123'
      }
    });
    
    console.log('Auth response status:', response.status());
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    console.log('Auth response:', JSON.stringify(data, null, 2));
    
    expect(data).toHaveProperty('success');
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('user');
    authToken = data.token;
  });
  
  
  test('Verify /api/items endpoint returns inventory items', async ({ request }) => {
    console.log('Testing /api/items endpoint directly...');
    
    // First authenticate to get a token for this test
    const authResponse = await request.post('http://localhost:5000/auth/login', {
      data: {
        email: 'admin@university.edu',
        password: 'admin123'
      }
    });
    
    expect(authResponse.status()).toBe(200);
    const authData = await authResponse.json();
    expect(authData).toHaveProperty('token');
    
    // Test the API endpoint directly without browser
    const response = await request.get('http://localhost:5000/api/items', {
      headers: {
        'Authorization': `Bearer ${authData.token}`
      }
    });
    
    // console.log('API Response status:', response.status());
    
    expect(response.status()).toBe(200);
    
    // Check content type before parsing as JSON
    const contentType = response.headers()['content-type'] || '';
    console.log('API Response content-type:', contentType);
    
    if (!contentType.includes('application/json')) {
      const responseText = await response.text();
      console.log('API Response (non-JSON):', responseText.substring(0, 500));
      throw new Error(`Expected JSON response, got: ${contentType}`);
    }
    
    const data = await response.json();
    console.log('API Response data:', JSON.stringify(data, null, 2));
    
    // Verify the response structure
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.items)).toBe(true);
    
    // Check if we have test items
    console.log(`Total items found: ${data.total}`);
    console.log(`Items array length: ${data.items.length}`);
    
    if (data.items.length > 0) {
      // console.log('Found inventory items:');
      data.items.forEach((item: any, index: number) => {
        console.log(`  ${index + 1}. ${item.name} (SKU: ${item.sku}) - Active: ${item.isActive}`);
      });
      
      // Look for our test items
      const testItems = data.items.filter((item: any) => 
        item.sku.includes('TEST') || item.sku.includes('WF-') || item.sku.includes('E2E-')
      );
      
      // console.log(`Test items found: ${testItems.length}`);
      testItems.forEach((item: any) => {
        console.log(`  - ${item.name} (${item.sku})`);
      });
      
      expect(testItems.length).toBeGreaterThan(0);
    } else {
      console.log('No inventory items found - this indicates the seeding issue persists');
    }
  });
  
});
