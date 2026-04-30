#!/bin/bash

# Test script for vendor page functionality
# Creates sample suppliers and orders to test the enhanced vendor display

echo "🧪 Testing Enhanced Vendor Page Functionality"
echo "============================================="

BASE_URL="http://localhost:5000"

echo ""
echo "1. Creating test suppliers..."

# Create supplier 1
curl -s -X POST "$BASE_URL/api/suppliers" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "TECH-CORP-001",
    "name": "TechCorp Solutions",
    "contact": "John Smith",
    "email": "orders@techcorp.co.uk",
    "phone": "+44 20 7946 0958",
    "address": "123 Tech Street, London, UK"
  }' | jq -r '.name // "Failed to create"' && echo " - TechCorp Solutions created"

# Create supplier 2
curl -s -X POST "$BASE_URL/api/suppliers" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "OFFICE-PLUS-002",
    "name": "Office Plus Ltd",
    "contact": "Sarah Johnson",
    "email": "procurement@officeplus.com",
    "phone": "+44 121 496 0370",
    "address": "456 Business Park, Birmingham, UK"
  }' | jq -r '.name // "Failed to create"' && echo " - Office Plus Ltd created"

# Create supplier 3
curl -s -X POST "$BASE_URL/api/suppliers" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "SUPPLY-CHAIN-003",
    "name": "Supply Chain Express",
    "contact": "Michael Brown",
    "email": "sales@supplychain.co.uk",
    "phone": "+44 161 839 6722"
  }' | jq -r '.name // "Failed to create"' && echo " - Supply Chain Express created"

echo ""
echo "2. Creating test categories..."

# Create category for electronics
curl -s -X POST "$BASE_URL/api/categories" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Electronics",
    "description": "Electronic devices and accessories",
    "icon": "fas fa-microchip",
    "color": "blue"
  }' > /dev/null && echo " - Electronics category created"

echo ""
echo "3. Creating sample orders..."

# Order 1 - TechCorp
curl -s -X POST "$BASE_URL/api/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "supplierId": "TECH-CORP-001",
    "notes": "Quarterly laptop procurement for IT department",
    "items": [
      {
        "itemName": "Business Laptop",
        "itemSku": "LAPTOP-BIZ-001",
        "itemDescription": "Intel i7, 16GB RAM, 512GB SSD",
        "categoryId": 1,
        "quantity": 10,
        "unitCost": 899.99
      },
      {
        "itemName": "Wireless Mouse",
        "itemSku": "MOUSE-WL-001",
        "itemDescription": "Ergonomic wireless mouse with USB receiver",
        "categoryId": 1,
        "quantity": 15,
        "unitCost": 24.99
      }
    ]
  }' > /dev/null && echo " - TechCorp order created (£9374.85)"

# Order 2 - Office Plus
curl -s -X POST "$BASE_URL/api/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "supplierId": "OFFICE-PLUS-002",
    "notes": "Office furniture for new building wing",
    "items": [
      {
        "itemName": "Ergonomic Office Chair",
        "itemSku": "CHAIR-ERG-001",
        "itemDescription": "Adjustable height with lumbar support",
        "quantity": 25,
        "unitCost": 189.99
      },
      {
        "itemName": "Standing Desk",
        "itemSku": "DESK-STAND-001",
        "itemDescription": "Electric height adjustable desk 120x80cm",
        "quantity": 12,
        "unitCost": 449.99
      }
    ]
  }' > /dev/null && echo " - Office Plus order created (£10149.63)"

# Order 3 - Supply Chain Express
curl -s -X POST "$BASE_URL/api/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "supplierId": "SUPPLY-CHAIN-003",
    "notes": "General office supplies monthly order",
    "items": [
      {
        "itemName": "A4 Paper Pack",
        "itemSku": "PAPER-A4-001",
        "itemDescription": "500 sheets per pack, 80gsm white",
        "quantity": 50,
        "unitCost": 4.99
      },
      {
        "itemName": "Ballpoint Pens",
        "itemSku": "PEN-BALL-001",
        "itemDescription": "Blue ink, pack of 10",
        "quantity": 20,
        "unitCost": 2.49
      }
    ]
  }' > /dev/null && echo " - Supply Chain Express order created (£299.30)"

echo ""
echo "4. Testing API endpoints..."

echo " - Getting suppliers:"
curl -s "$BASE_URL/api/suppliers" | jq -r '.[].name // "No suppliers found"' | head -3

echo ""
echo "5. Testing enhanced vendor page..."
echo " - Open http://localhost:5000/vendors in your browser"
echo " - You should see 3 suppliers with order statistics"
echo " - Click on any supplier to see their order history"

echo ""
echo "✅ Test data created successfully!"
echo "📊 Expected results:"
echo "   - TechCorp Solutions: 1 order, £9,374.85 total"
echo "   - Office Plus Ltd: 1 order, £10,149.63 total"  
echo "   - Supply Chain Express: 1 order, £299.30 total"
