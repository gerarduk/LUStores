# Orders Tab Features Guide

## Invoice PDF Attachments

### Overview
You can now attach invoice PDFs to orders for record-keeping and easy access. This feature allows you to store, view, and download invoice documents directly from the Orders page.

### How to Upload an Invoice PDF

1. Navigate to the **Orders** tab
2. Find the order you want to attach an invoice to
3. In the Actions column, click the **Upload** icon (📤)
4. Select your PDF file (max 10MB)
5. The PDF will be uploaded and associated with the order
6. Once uploaded, the upload icon will change to a **View** icon (📄)

### How to View/Download an Invoice PDF

1. Navigate to the **Orders** tab
2. Find the order with an attached PDF (indicated by green 📄 icon)
3. Click the **View** icon in the Actions column
4. The PDF will open in a new tab for viewing or downloading

### Technical Details

- **File Format**: PDF only
- **Max File Size**: 10MB
- **Storage Location**: Files are stored in `public/uploads/invoices/`
- **File Naming**: `order-{orderId}-{timestamp}-{originalName}.pdf`

---

## Order Import Templates

### Overview
The system provides JSON and CSV templates to help you import orders in bulk. These templates show the exact format required for successful order imports.

### How to Download Templates

1. Navigate to the **Orders** tab
2. Click **Import JSON** button
3. In the import dialog, you'll see a blue info card at the top
4. Click either:
   - **JSON Template** - Download JSON format template
   - **CSV Template** - Download CSV format template

### JSON Template Format

```json
{
  "orderId": "ORD-2025-001",
  "supplier": {
    "id": "supplier-id-here",
    "name": "Supplier Name"
  },
  "notes": "Optional order notes",
  "subtotal": "100.00",
  "vatRate": "0.20",
  "vatAmount": "20.00",
  "total": "120.00",
  "deliveryCharge": "5.00",
  "receivedDate": null,
  "items": [
    {
      "itemId": "existing-item-id-or-leave-blank",
      "itemSku": "SKU001",
      "itemName": "Item Name",
      "itemDescription": "Optional description",
      "quantity": "10",
      "unitCost": "10.00",
      "totalCost": "100.00",
      "categoryId": "category-id-or-leave-blank"
    }
  ]
}
```

#### JSON Field Descriptions

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `orderId` | Yes | String | Unique order identifier |
| `supplier.id` | No | String | Existing supplier ID from system |
| `supplier.name` | No | String | Supplier name |
| `notes` | No | String | Order notes |
| `subtotal` | Yes | String | Order subtotal (pre-VAT) |
| `vatRate` | Yes | String | VAT rate as decimal (e.g., "0.20" for 20%) |
| `vatAmount` | Yes | String | Calculated VAT amount |
| `total` | Yes | String | Total amount including VAT |
| `deliveryCharge` | No | String | Delivery/shipping charge |
| `receivedDate` | No | String/null | Date order was received (ISO format) |
| `items` | Yes | Array | Array of order items |
| `items[].itemId` | No | String | Existing item ID to link to inventory |
| `items[].itemSku` | Yes | String | Item SKU/code |
| `items[].itemName` | Yes | String | Item name |
| `items[].itemDescription` | No | String | Item description |
| `items[].quantity` | Yes | String | Quantity ordered |
| `items[].unitCost` | Yes | String | Cost per unit |
| `items[].totalCost` | Yes | String | Total cost for this line item |
| `items[].categoryId` | No | String | Category ID if linking to existing category |

### CSV Template Format

```csv
Order ID,Supplier ID,Supplier Name,Notes,Item SKU,Item Name,Item Description,Quantity,Unit Cost,Category ID,Delivery Charge,VAT Rate
ORD-2025-001,supplier-id,Supplier Name,Order notes,SKU001,Item Name,Item description,10,10.00,category-id,5.00,0.20
ORD-2025-001,supplier-id,Supplier Name,Order notes,SKU002,Another Item,Another description,5,15.00,category-id,5.00,0.20
```

#### CSV Format Notes

- **Multiple Items**: For orders with multiple items, repeat the row with the same Order ID
- **Headers**: First row must contain column headers (as shown above)
- **Encoding**: UTF-8
- **Delimiter**: Comma (,)
- **Empty Fields**: Leave blank for optional fields
- **VAT Rate**: Express as decimal (0.20 = 20%)

### How to Import Orders

#### From JSON:

1. Download and fill out the JSON template
2. Click **Import JSON** in the Orders tab
3. Select your filled JSON file
4. Review the parsed data in the preview
5. Click **Import as Order** to create the order

#### From CSV:

1. Download and fill out the CSV template
2. CSV import currently requires conversion to JSON format
3. Use a CSV-to-JSON converter or contact admin for bulk imports

---

## Best Practices

### PDF Attachments

✅ **DO:**
- Upload PDFs immediately when you receive them
- Use clear, descriptive filenames
- Keep file sizes under 5MB when possible

❌ **DON'T:**
- Upload non-PDF files (system will reject them)
- Upload files larger than 10MB
- Upload multiple PDFs for the same order (only one PDF per order)

### Order Imports

✅ **DO:**
- Always download the latest template before creating import files
- Validate your data before importing
- Test with a single-item order first
- Keep backup copies of your import files

❌ **DON'T:**
- Modify the template structure or field names
- Use special characters in IDs
- Leave required fields empty
- Mix currencies or VAT rates in a single order

---

## Troubleshooting

### PDF Upload Issues

**Problem**: "Only PDF files are allowed"
- **Solution**: Ensure file has .pdf extension and is actually a PDF

**Problem**: "File size must be less than 10MB"
- **Solution**: Compress the PDF or split into multiple files

**Problem**: PDF upload button doesn't appear
- **Solution**: Refresh the page and try again

### Import Issues

**Problem**: "Invalid JSON format"
- **Solution**: Validate your JSON using a JSON validator (jsonlint.com)

**Problem**: "Supplier not found"
- **Solution**: Use existing supplier ID from system or leave blank

**Problem**: "Item quantities are wrong"
- **Solution**: Check that quantities are formatted as strings without currency symbols

---

## API Endpoints

For developers integrating with the system:

### PDF Upload
```
POST /api/orders/:id/upload-invoice
Content-Type: multipart/form-data
Body: FormData with 'invoice' file field
```

### PDF Download
```
GET /api/orders/:id/invoice-pdf
Response: PDF file with Content-Disposition: inline
```

### Template Downloads
```
GET /api/orders/import-template/json
GET /api/orders/import-template/csv
```

---

## Migration Notes

The `invoice_pdf_path` column was added to the `orders` table via migration `009_add_invoice_pdf_path_to_orders.sql`.

Existing orders will not have PDFs attached. PDFs can be uploaded retroactively for any order.

---

*Last Updated: 2025-12-22*
*Feature Version: 1.0*
