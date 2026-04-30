import { test, expect } from '@playwright/test';

test.describe('Inventory API Verification', () => {
  test('Verify /api/items endpoint returns seeded inventory items', async ({ request }) => {
    // First authenticate to get a token
    const authResponse = await request.post('/auth/login', {
      data: {
        email: 'admin@university.edu',
        password: 'admin123'
      }
    });
    
    console.log('Auth response status:', authResponse.status());
    
    // Check if auth response is HTML (error page) instead of JSON
    const authContentType = authResponse.headers()['content-type'] || '';
    console.log('Auth response content-type:', authContentType);
    
    if (!authContentType.includes('application/json')) {
      const authText = await authResponse.text();
      console.log('Auth response (non-JSON):', authText.substring(0, 200));
      throw new Error(`Expected JSON response from auth, got: ${authContentType}`);
    }
    
    const authData = await authResponse.json();
    console.log('Auth response:', authData);
    
    expect(authResponse.status()).toBe(200);
    expect(authData.token).toBeDefined();
    
    // Now test the inventory API with the token
    const inventoryResponse = await request.get('/api/items', {
      headers: {
        'Authorization': `Bearer ${authData.token}`
      }
    });
    
    console.log('Inventory response status:', inventoryResponse.status());
    console.log('Inventory response headers:', inventoryResponse.headers());
    
    // Check if response is HTML (error page) instead of JSON
    const contentType = inventoryResponse.headers()['content-type'] || '';
    console.log('Inventory response content-type:', contentType);
    
    if (!contentType.includes('application/json')) {
      const responseText = await inventoryResponse.text();
      console.log('Inventory response (non-JSON):', responseText.substring(0, 500));
      throw new Error(`Expected JSON response from API, got: ${contentType}`);
    }
    
    const inventoryData = await inventoryResponse.json();
    console.log('Inventory response:', inventoryData);
    
    expect(inventoryResponse.status()).toBe(200);
    expect(inventoryData).toHaveProperty('items');
    expect(inventoryData).toHaveProperty('total');
    expect(Array.isArray(inventoryData.items)).toBe(true);
    expect(inventoryData.items.length).toBeGreaterThan(0);
    expect(inventoryData.total).toBeGreaterThan(0);
    
    // Verify test items exist (check for actual test items in database)
    const itemNames = inventoryData.items.map((item: any) => item.name);
    const testItems = inventoryData.items.filter((item: any) => 
      item.sku.includes('TEST') || item.name.includes('Test')
    );
    
    console.log('Available test items:', testItems.map(item => `${item.name} (${item.sku})`));
    expect(testItems.length).toBeGreaterThan(0);
    
    // Verify we have some common test items (flexible matching)
    const hasTestItems = itemNames.some(name => name.includes('Test'));
    expect(hasTestItems).toBe(true);
    
    console.log('Inventory API verification successful!');
    console.log('Found test items:', itemNames);
  });
});
