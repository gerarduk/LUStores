// Test script for JSON order import functionality
const fs = require('fs');

async function testJsonImport() {
  try {
    // Read the sample order JSON
    const sampleOrder = JSON.parse(fs.readFileSync('./sample_order.json', 'utf8'));
    
    console.log('📦 Testing JSON Order Import...');
    console.log('Order ID:', sampleOrder.orderId);
    console.log('Supplier:', sampleOrder.supplier.name);
    console.log('Total:', sampleOrder.total);
    console.log('Items count:', sampleOrder.items.length);
    
    // Test API endpoint
    const response = await fetch('http://localhost:5000/api/orders/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleOrder)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Order imported successfully!');
      console.log('Created order ID:', result.id);
      console.log('Created items count:', result.itemsCreated);
      
      // Test the add to inventory endpoint
      console.log('\n📦 Testing Add to Inventory...');
      const inventoryResponse = await fetch(`http://localhost:5000/api/orders/${result.id}/add-to-inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (inventoryResponse.ok) {
        const inventoryResult = await inventoryResponse.json();
        console.log('✅ Items added to inventory successfully!');
        console.log('Items processed:', inventoryResult.itemsProcessed);
      } else {
        console.error('❌ Failed to add to inventory:', inventoryResponse.status);
        const error = await inventoryResponse.text();
        console.error(error);
      }
      
    } else {
      console.error('❌ Failed to import order:', response.status);
      const error = await response.text();
      console.error(error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testJsonImport();
