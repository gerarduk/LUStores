# Quick Start: Charge Code Exclusions

This guide will walk you through setting up charge code exclusions in 5 minutes.

## Step 1: Identify Your Categories

First, see what categories exist in your system:

```bash
curl -X GET 'http://localhost:3000/api/categories' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

Example response:
```json
[
  {"id": 1, "name": "Stationery", "description": "Office supplies"},
  {"id": 2, "name": "IT Equipment", "description": "Computers and tech"},
  {"id": 3, "name": "Office Furniture", "description": "Desks, chairs, etc."}
]
```

## Step 2: Check Your Charge Codes

List existing charge codes:

```bash
curl -X GET 'http://localhost:3000/api/chargecodes' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

## Step 3: Create an Exclusion

Prevent charge code "ACCT001" from buying IT Equipment (category ID 2):

```bash
curl -X POST \
  'http://localhost:3000/api/chargecodes/ACCT001/exclusions' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"categoryId": 2}'
```

## Step 4: Verify the Exclusion

Check that the exclusion was created:

```bash
curl -X GET 'http://localhost:3000/api/chargecodes/ACCT001/exclusions' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

## Step 5: Test the Exclusion

Try to create a sale with the excluded combination. The system should reject it with an error like:

```json
{
  "message": "Charge code 'ACCT001' cannot be used for items in the following categories: Laptop Computer (IT Equipment)",
  "code": "CHARGE_CODE_EXCLUSION"
}
```

## Common Exclusion Patterns

### Research Department Restrictions
```bash
# Prevent research codes from buying office supplies
curl -X POST 'http://localhost:3000/api/chargecodes/RESEARCH001/exclusions' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"categoryId": 1}'
```

### Temporary Access Limitations
```bash
# Restrict temporary codes from expensive categories
curl -X POST 'http://localhost:3000/api/chargecodes/TEMP001/exclusions' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"categoryId": 2}'
```

### Department Budget Controls
```bash
# Prevent accounting from buying IT equipment
curl -X POST 'http://localhost:3000/api/chargecodes/ACCT001/exclusions' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"categoryId": 2}'

# Prevent marketing from buying furniture
curl -X POST 'http://localhost:3000/api/chargecodes/MKTG001/exclusions' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"categoryId": 3}'
```

## Removing Exclusions

To remove an exclusion:

```bash
curl -X DELETE \
  'http://localhost:3000/api/chargecodes/ACCT001/exclusions/2' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

## Need Help?

- Full documentation: [Charge Code Exclusions Guide](./charge-code-exclusions.md)
- API reference: [API Documentation](./api/charge-codes.md)
- Contact: System administrator
