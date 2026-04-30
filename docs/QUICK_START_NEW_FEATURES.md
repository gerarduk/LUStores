# Quick Start Guide - New Features

## 🎯 Overview
This guide will help you quickly get started with the newly implemented features in LUStores.

---

## 1. 📱 Camera-Based QR/Barcode Scanner (Sales & Quotes)

### What it does
Quickly add items to quotes by scanning QR codes or barcodes using your mobile device's camera.

### How to use
1. Go to **Sales & Quotes** page on your mobile device or tablet
2. Click the **Browse Items** tab
3. You'll see the QR/Barcode Scanner card at the top
4. **Option A**: Camera scanning (recommended for mobile)
   - Click "Start Camera" button
   - Allow camera permissions when prompted
   - Point your camera at the QR code or barcode on the shelf
   - Hold steady until the code is detected
   - The item will be automatically added to your quote
   - If it's already in the quote, quantity will increment
5. **Option B**: Manual entry
   - Type the SKU in the input field
   - Click "Add" button or press Enter

### Tips
- Works best with good lighting on the shelf
- Use back camera on mobile devices for better quality
- Hold device 4-6 inches from the code
- Green feedback means success, red means item not found
- Camera automatically stops after 1.5 seconds to prevent duplicates

---

## 2. 🌙 Dark Mode

### What it does
Switches between light and dark themes for comfortable viewing.

### How to use
1. Look for the **sun/moon icon** in the top-right corner
2. Click it to open the theme menu
3. Select:
   - **Light** - Traditional light theme
   - **Dark** - Dark theme for low-light environments
   - **System** - Automatically matches your OS preference

### Tips
- Theme choice is saved automatically
- Applies to all pages instantly
- Works great for warehouse environments with different lighting

---

## 3. ⚙️ Column Customization

### What it does
Customize which columns you see in tables and their order.

### How to use
1. On any page with tables (Inventory, Sales, etc.)
2. Look for the **"Customize Columns"** button (gear icon)
3. Click it to open the customizer
4. **To hide/show**: Click the checkbox next to a column name
5. **To reorder**: Drag columns using the grip icon
6. **To reset**: Click the "Reset" button

### Tips
- Required columns (marked) cannot be hidden
- Your preferences are saved per page
- Perfect for focusing on relevant data

---

## 4. ⚡ Quick Filters

### What it does
Apply common filters with one click.

### How to use
1. Look for the **Quick Filters** section on list pages
2. Click any filter badge to activate it
3. Click again to deactivate
4. Multiple filters can be active at once
5. Click **Clear All** to remove all filters

### Common Filters
- **In Stock** - Items with available inventory
- **Low Stock** - Items below minimum threshold
- **Out of Stock** - Items with zero inventory
- *(More filters available per page)*

### Tips
- Hover over filters to see descriptions
- Active filters show in blue
- Counter shows how many filters are active

---

## 5. 📄 CSV Batch Import

### What it does
Import multiple items at once from a CSV file.

### How to use
1. Go to the page where you want to import (e.g., Inventory)
2. Click **"Bulk Import"** or **"CSV Import"**
3. **Download Template** (recommended for first time)
4. Fill in your data in the CSV file
5. **Drag and drop** the file OR click to browse
6. Review the **preview** of your data
7. Click **Import** to process

### CSV Format Example
```csv
Name,SKU,Price,Current Stock,Location
Widget A,WID-001,9.99,100,A1-B2-C3
Widget B,WID-002,14.99,50,A1-B2-C4
```

### Tips
- Download template first to see exact format
- Required fields are marked in template
- Preview shows first 10 rows before import
- Errors are reported with row numbers
- Can import hundreds of items at once

---

## 6. 📋 Picking Lists

### What it does
Generates a printable list showing where to find items when processing sales.

### How to use
1. Create a quote in **Sales & Quotes**
2. Add items to the quote
3. Enter charge code
4. Click **"Process Quote"**
5. After successful processing, the **Picking List** automatically appears
6. Review items grouped by location
7. Click **Print** to generate paper copy

### Picking List Features
- Items grouped by warehouse location
- Checkboxes to mark items as picked
- Shows quantity, SKU, and location
- Includes sale ID and charge code
- Print-optimized layout

### Tips
- Pick items in location order for efficiency
- Check off items as you collect them
- Keep printed list with items during fulfillment
- If location is "Unknown", check inventory page

---

## 7. 🔄 Enhanced Bulk Operations

### What it does
Perform actions on multiple items at once.

### How to use
1. On tables with checkboxes (Inventory, Sales Browse)
2. Select items using checkboxes
3. Click **Bulk Actions** dropdown
4. Choose an action:
   - **Add All to Quote** - Add selected items (qty 1)
   - **Add All (Custom Qty)** - Add with specific quantity
   - **Remove from Quote** - Remove selected items
   - **Export Selected** - Download as CSV

### Tips
- Use "Select All" checkbox in header for all items
- Selection count shows in top-right
- Can combine with filters for smart selections
- Export preserves current filtering

---

## 🎓 Workflow Examples

### Example 1: Fast Quote Creation with Camera Scanner
1. Open Sales & Quotes → Browse Items on mobile device
2. Click "Start Camera"
3. Walk through warehouse scanning item codes on shelves
4. Items automatically add to quote
5. Review totals
6. Enter charge code
7. Process → Picking list generated

### Example 2: Bulk Inventory Update
1. Export current inventory to CSV
2. Update prices/stock in spreadsheet
3. Save as new CSV
4. Use CSV Import to upload changes
5. Review preview
6. Import → Inventory updated

### Example 3: Efficient Order Fulfillment
1. Customer places order via quote
2. Process quote → Picking list appears
3. Print picking list
4. Follow locations in order
5. Check off items as collected
6. Deliver items to customer

### Example 4: Custom Table View
1. Open Inventory page
2. Click Customize Columns
3. Hide columns you don't need (e.g., internal notes)
4. Reorder to put important columns first
5. Settings saved automatically

---

## 🆘 Troubleshooting

### Camera Scanner not working
- Allow camera permissions in browser settings
- Check if camera is being used by another app
- Ensure good lighting on the barcode/QR code
- Try cleaning the camera lens
- Use manual entry as fallback
- Works best on Chrome/Safari on mobile devices

### Dark mode looks strange
- Try selecting "System" theme
- Check your OS dark mode settings
- Refresh the page (Ctrl+F5)

### CSV Import errors
- Download and use the template
- Check required fields are filled
- Ensure no special characters in data
- Save as CSV (not Excel format)

### Picking list missing locations
- Update item locations in Inventory page
- Location field may be empty for older items
- Shows "Unknown Location" if not set

### Column customization not saving
- Check browser localStorage is enabled
- Try different browser if issue persists
- Clear browser cache and try again

---

## 📞 Additional Help

- Check the **Documentation** page in the app
- See **NEW_FEATURES_IMPLEMENTATION.md** for technical details
- Contact system administrator for advanced configurations
