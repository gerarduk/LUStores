# LUStores API Documentation

This is the auto-generated API documentation for the LUStores (University Inventory Management System) backend services.

## Overview

The LUStores API provides comprehensive endpoints for managing university inventory, including:

- **Authentication & Authorization**: User management, role-based access control
- **Inventory Management**: Items, categories, suppliers, stock tracking
- **Sales & Quotes**: Sales processing, quote generation, stock checking
- **Reporting**: Analytics, reports, data export
- **System Management**: Settings, permissions, user management

## Architecture

The API follows RESTful principles and is built with:

- **Express.js**: Web framework
- **TypeScript**: Type-safe development
- **PostgreSQL**: Database with Drizzle ORM
- **JWT**: Authentication tokens
- **Role-based permissions**: Granular access control

## Base URL

- **Production**: `https://lustores.yourdomain.com/api`
- **Development**: `http://localhost:5000/api`

## Authentication

Most endpoints require authentication via JWT token:

```http
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow a consistent JSON format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Success message",
  "timestamp": "2025-08-27T12:00:00Z"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-08-27T12:00:00Z"
}
```

## Rate Limiting

- **API endpoints**: 10 requests/second (20 burst)
- **Authentication endpoints**: 5 requests/minute (5 burst)

## Key Modules

### Routes (`routes.ts`)
Main API endpoints for all functionality including inventory, sales, users, and system management.

### Permissions (`permissions.ts`)
Role-based access control system with granular permissions.

### Database Configuration (`dbConfig.ts`)
Database connection and ORM configuration.

### Authentication
JWT-based authentication with session management.

## Getting Started

1. **Authentication**: Login to get JWT token
2. **Authorization**: Include token in Authorization header
3. **API Calls**: Make requests to documented endpoints
4. **Error Handling**: Handle standard HTTP status codes

## Examples

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@university.edu",
  "password": "password"
}
```

### Get Items
```http
GET /api/items
Authorization: Bearer <token>
```

### Create Item
```http
POST /api/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Laptop",
  "description": "Dell Laptop",
  "categoryId": "cat-123",
  "price": 999.99,
  "stock": 10
}
```

## Support

For questions about the API:

- **Documentation**: [https://st7ma784.github.io/LUStores/](https://st7ma784.github.io/LUStores/)
- **GitHub Issues**: [https://github.com/st7ma784/LUStores/issues](https://github.com/st7ma784/LUStores/issues)
- **Source Code**: [https://github.com/st7ma784/LUStores](https://github.com/st7ma784/LUStores)
