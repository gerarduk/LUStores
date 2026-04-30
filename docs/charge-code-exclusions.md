# Charge Code Exclusions Guide

## Overview

The LUStores system supports charge code exclusions, which allow administrators to prevent certain charge codes from being used to purchase items from specific categories. This feature is useful for implementing business rules such as:

- Preventing research budgets from purchasing office furniture
- Restricting certain departments from buying IT equipment
- Enforcing specific procurement policies by category

## How Exclusions Work

When a sale is attempted with a charge code that has exclusions:

1. The system validates the charge code (existence, expiration, validity dates)
2. The system checks if any items in the cart belong to excluded categories
3. If excluded items are found, the sale is rejected with a detailed error message
4. If no excluded items are found, the sale proceeds normally

## Managing Charge Code Exclusions

### Prerequisites

- Admin or superuser role required
- Valid charge codes must exist in the system
- Categories must be configured

### Adding Exclusions

#### Via API

**Endpoint:** `POST /api/chargecodes/{code}/exclusions`

**Request Body:**
```json
{
  "categoryId": 1
}
```

**Example:**
```bash
curl -X POST \
  'http://localhost:3000/api/chargecodes/ACCT001/exclusions' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "categoryId": 2
  }'
```

**Response:**
```json
{
  "message": "Exclusion created successfully",
  "chargeCode": "ACCT001",
  "categoryId": 2,
  "categoryName": "IT Equipment"
}
```

### Viewing Exclusions

**Endpoint:** `GET /api/chargecodes/{code}/exclusions`

**Example:**
```bash
curl -X GET \
  'http://localhost:3000/api/chargecodes/ACCT001/exclusions' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Response:**
```json
{
  "chargeCode": "ACCT001",
  "excludedCategoryIds": [1, 2],
  "excludedCategories": [
    {
      "id": 1,
      "name": "Stationery",
      "description": "Office supplies and stationery items"
    },
    {
      "id": 2,
      "name": "IT Equipment",
      "description": "Computers, peripherals, and IT hardware"
    }
  ]
}
```

### Removing Exclusions

**Endpoint:** `DELETE /api/chargecodes/{code}/exclusions/{categoryId}`

**Example:**
```bash
curl -X DELETE \
  'http://localhost:3000/api/chargecodes/ACCT001/exclusions/2' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Response:**
```json
{
  "message": "Exclusion deleted successfully",
  "chargeCode": "ACCT001",
  "categoryId": 2
}
```

## Common Use Cases

### Example 1: Research Budget Restrictions

Prevent research charge codes from purchasing office supplies:

```bash
# Get the category ID for "Office Supplies"
curl -X GET 'http://localhost:3000/api/categories'

# Add exclusion for research charge code
curl -X POST \
  'http://localhost:3000/api/chargecodes/RESEARCH001/exclusions' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"categoryId": 1}'
```

### Example 2: Department IT Restrictions

Prevent certain departments from purchasing IT equipment:

```bash
# Add exclusion for accounting department
curl -X POST \
  'http://localhost:3000/api/chargecodes/ACCT001/exclusions' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"categoryId": 2}'

# Add exclusion for marketing department
curl -X POST \
  'http://localhost:3000/api/chargecodes/MKTG001/exclusions' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"categoryId": 2}'
```

### Example 3: Multiple Category Restrictions

Restrict a charge code from multiple categories:

```bash
# Prevent TEMP001 from buying stationery
curl -X POST \
  'http://localhost:3000/api/chargecodes/TEMP001/exclusions' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"categoryId": 1}'

# Prevent TEMP001 from buying IT equipment
curl -X POST \
  'http://localhost:3000/api/chargecodes/TEMP001/exclusions' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"categoryId": 2}'

# Prevent TEMP001 from buying furniture
curl -X POST \
  'http://localhost:3000/api/chargecodes/TEMP001/exclusions' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"categoryId": 3}'
```

## Sales Validation

When a sale is attempted with excluded items, the system returns a detailed error:

**Example Error Response:**
```json
{
  "message": "Charge code 'ACCT001' cannot be used for items in the following categories: Laptop Computer (IT Equipment), Office Printer (IT Equipment)",
  "code": "CHARGE_CODE_EXCLUSION",
  "excludedItems": [
    {
      "itemName": "Laptop Computer",
      "categoryName": "IT Equipment"
    },
    {
      "itemName": "Office Printer", 
      "categoryName": "IT Equipment"
    }
  ]
}
```

## Database Schema

The exclusions are stored in the `charge_code_exclusions` table:

```sql
CREATE TABLE charge_code_exclusions (
  id SERIAL PRIMARY KEY,
  charge_code VARCHAR NOT NULL REFERENCES chargecodes(code),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  created_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Error Codes

| Error Code | Description |
|------------|-------------|
| `CHARGE_CODE_EXCLUSION` | The charge code is excluded from purchasing items in the specified categories |
| `INVALID_CHARGE_CODE` | The charge code does not exist |
| `EXPIRED_CHARGE_CODE` | The charge code has expired |
| `PREMATURE_CHARGE_CODE` | The charge code is not yet valid |

## Best Practices

1. **Plan Your Categories**: Set up your category structure before implementing exclusions
2. **Document Exclusions**: Keep track of which charge codes have exclusions and why
3. **Regular Review**: Periodically review exclusions to ensure they're still needed
4. **Test Thoroughly**: Test exclusions with actual sales to verify they work as expected
5. **User Communication**: Inform users about exclusions when they're implemented

## Troubleshooting

### Common Issues

**Problem**: Exclusion not working
- Check if the charge code exists: `GET /api/chargecodes/{code}`
- Verify the category ID is correct: `GET /api/categories`
- Ensure the exclusion was created: `GET /api/chargecodes/{code}/exclusions`

**Problem**: Cannot create exclusion
- Verify you have admin/superuser permissions
- Check if the exclusion already exists
- Ensure both charge code and category exist

**Problem**: Sales still going through despite exclusions
- Verify the items belong to the excluded categories
- Check the sales validation logic is working
- Ensure the charge code matches exactly (case sensitive)

## Integration Notes

- Exclusions are checked during the sales validation process
- They work alongside existing charge code validation (expiration, validity dates)
- Exclusions are enforced for both individual sales and quote processing
- The validation happens before stock checks to fail fast on exclusion violations

## Security Considerations

- Only admin and superuser roles can manage exclusions
- All exclusion changes are logged with the user who made them
- Exclusions cannot be bypassed through different API endpoints
- The system maintains audit trails for all exclusion operations
