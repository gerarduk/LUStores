#!/bin/bash

echo "🧪 Testing LUStores JSON Import and Invoice Features"
echo "=================================================="

# Test 1: JSON Order Import
echo ""
echo "📦 Test 1: JSON Order Import"
echo "----------------------------"

# Import our sample order
response=$(curl -s -X POST http://localhost:5000/api/orders/import \
  -H "Content-Type: application/json" \
  -d @sample_order.json)

# Check if we got a valid response (should be JSON, not HTML)
if echo "$response" | grep -q "orderId"; then
    echo "✅ JSON Order import successful!"
    echo "Response: $response"
    
    # Extract order ID for inventory test
    order_id=$(echo "$response" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
    echo "📋 Created order with ID: $order_id"
    
    # Test 2: Add to Inventory
    echo ""
    echo "📦 Test 2: Add to Inventory"
    echo "---------------------------"
    
    # First update order status to received (required for inventory addition)
    update_response=$(curl -s -X PUT http://localhost:5000/api/orders/$order_id \
      -H "Content-Type: application/json" \
      -d '{"status": "received"}')
    
    if echo "$update_response" | grep -q "received"; then
        echo "✅ Order status updated to received"
        
        # Now try to add to inventory
        inventory_response=$(curl -s -X POST http://localhost:5000/api/orders/$order_id/add-to-inventory \
          -H "Content-Type: application/json")
        
        if echo "$inventory_response" | grep -q "successfully"; then
            echo "✅ Items added to inventory successfully!"
            echo "Response: $inventory_response"
        else
            echo "❌ Failed to add items to inventory"
            echo "Response: $inventory_response"
        fi
    else
        echo "❌ Failed to update order status"
        echo "Response: $update_response"
    fi
    
else
    echo "❌ JSON Order import failed"
    echo "Response: $response"
fi

# Test 3: Check orders list
echo ""
echo "📦 Test 3: Verify Orders List"
echo "-----------------------------"

orders_response=$(curl -s http://localhost:5000/api/orders)
if echo "$orders_response" | grep -q "orders"; then
    order_count=$(echo "$orders_response" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')
    echo "✅ Orders API working - Total orders: $order_count"
else
    echo "❌ Failed to fetch orders list"
    echo "Response: $orders_response"
fi

# Test 4: JSON Validation Tests
echo ""
echo "📦 Test 4: JSON Validation Tests"
echo "--------------------------------"

# Test invalid JSON (missing orderId)
invalid_json='{"items": [{"itemId": 1, "sku": "TEST", "name": "Test", "quantity": 1, "unitCost": 10}]}'
invalid_response=$(curl -s -X POST http://localhost:5000/api/orders/import \
  -H "Content-Type: application/json" \
  -d "$invalid_json")

if echo "$invalid_response" | grep -q "missing orderId"; then
    echo "✅ JSON validation working - correctly rejected invalid order"
else
    echo "❌ JSON validation failed"
    echo "Response: $invalid_response"
fi

echo ""
echo "🎉 Testing Complete!"
echo "==================="

# Show current order count
final_orders=$(curl -s http://localhost:5000/api/orders)
final_count=$(echo "$final_orders" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')
echo "📊 Final order count: $final_count"

echo ""
echo "💡 Next Steps:"
echo "- Open http://localhost:5000 in your browser"
echo "- Navigate to the Orders page"
echo "- Try the 'Upload Invoice PDF' button"
echo "- Test the 'Import JSON' functionality"
echo "- Use the 'Add to Inventory' button on received orders"
