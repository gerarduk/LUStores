# Orders Management - New Order & CSV Import Features

## Overview

The Orders page in LUStores allows you to create procurement orders for bulk inventory management. There are two ways to create orders:

1. **Manual Order Creation** - Using the "New Order" button
2. **CSV Import** - Using the "Import CSV" button for bulk order creation

## Creating a New Order Manually

### Steps:
1. Navigate to the **Orders** page from the sidebar
2. Click the **"New Order"** button in the top-right corner
3. Fill in the order details:
   - **Supplier** (optional): Select from existing suppliers
   - **Notes** (optional): Add any relevant notes about the order
4. Add items to the order:
   - Click **"Add Item"** to add a new item row
   - Fill in the required fields for each item:
     - **Item Name** (required)
     - **SKU** (required)  
     - **Description** (optional)
     - **Category** (optional)
     - **Unit Cost** (required)
     - **Quantity** (required)
5. Review the total cost displayed at the bottom
6. Click **"Create Order"** to submit

### Features:
- Real-time total calculation
- Item validation (all required fields must be filled)
- Remove individual items with the trash icon
- Order cannot be created without at least one item

## Importing Orders from CSV

### CSV File Format

Your CSV file must include these **required columns**:
- `item_name` - Name of the item
- `item_sku` - Stock Keeping Unit (SKU) code
- `quantity` - Number of items to order
- `unit_cost` - Cost per unit (decimal format)

**Optional columns**:
- `item_description` - Detailed description of the item
- `category_id` - Numeric ID of the category

### Sample CSV Format:
```csv
item_name,item_sku,quantity,unit_cost,item_description,category_id
"Office Chair","CHAIR-001",5,89.99,"Ergonomic office chair with adjustable height",1
"Laptop Stand","STAND-002",10,24.99,"Adjustable aluminum laptop stand",2
"Wireless Mouse","MOUSE-003",25,15.99,"Bluetooth wireless mouse with optical tracking",2
```

### Import Steps:
1. Navigate to the **Orders** page
2. Click the **"Import CSV"** button next to "New Order"
3. Click **"Choose File"** and select your CSV file
4. Review the **Preview** showing the first 5 rows of your data
5. Verify the data looks correct
6. Click **"Import Order"** to create the order

### Import Features:
- **File Validation**: Ensures CSV format and required columns
- **Data Preview**: Shows first 5 rows before import
- **Error Handling**: Clear error messages for invalid data
- **Automatic Notes**: Adds filename to order notes for tracking

## Order Management

### Viewing Orders
- All orders are displayed in a paginated table
- Shows order ID, supplier, total amount, status, and creation date
- Click the **eye icon** to view detailed order information

### Order Status
- **Pending**: Order created but not yet received
- **Completed**: All items have been received and added to inventory

### Receiving Orders
- Click **"Mark as Received"** to process an order
- This automatically adds all ordered items to your inventory
- Updates the order status to "Completed"

## Troubleshooting

### New Order Button Not Working
If the "New Order" button doesn't open the dialog:
1. Check browser console for JavaScript errors
2. Ensure you're logged in with proper permissions
3. Try refreshing the page
4. Clear browser cache if issues persist

### CSV Import Issues

**"Missing required headers" error:**
- Ensure your CSV has exactly these column names: `item_name`, `item_sku`, `quantity`, `unit_cost`
- Check for extra spaces or different spelling
- Column names are case-sensitive (use lowercase with underscores)

**"Invalid CSV file" error:**
- Make sure the file has a `.csv` extension
- Ensure the file is properly formatted with commas as separators
- Check that there are no special characters or encoding issues

**Import fails with valid CSV:**
- Verify all quantity values are positive integers
- Ensure all unit_cost values are valid decimal numbers
- Check that item names and SKUs are not empty

## Best Practices

### Manual Order Creation
- Always fill in supplier information when known
- Use descriptive item names and SKUs for easy identification
- Add detailed descriptions to help with inventory management
- Double-check quantities and costs before submitting

### CSV Import
- Use a consistent naming convention for SKUs
- Include item descriptions when possible
- Validate your CSV data before importing
- Keep CSV files as backups for audit purposes
- Test with a small CSV file first to ensure format is correct

## API Integration

Both manual and CSV order creation use the same backend API endpoint:
- **Endpoint**: `POST /api/orders`
- **Authentication**: Required (user must be logged in)
- **Permissions**: Standard users can create orders

### Request Format:
```json
{
  "supplierId": "optional-supplier-id",
  "notes": "optional notes",
  "items": [
    {
      "itemName": "Item Name",
      "itemSku": "SKU-001",
      "itemDescription": "Optional description",
      "categoryId": 1,
      "quantity": 5,
      "unitCost": 29.99
    }
  ]
}
```

The system automatically calculates total costs and creates order items with proper validation.
