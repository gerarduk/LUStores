# Sequence Diagrams - User Workflows

## 1. User Authentication Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant B as Browser
    participant LB as Load Balancer
    participant App as Application
    participant SSO as University SSO
    participant DB as Database
    participant Session as Session Store

    U->>B: Access application
    B->>LB: GET /dashboard
    LB->>App: Forward request
    App->>App: Check authentication
    App-->>B: Redirect to login
    B-->>U: Show login options

    U->>B: Select SSO login
    B->>App: POST /auth/sso
    App->>SSO: Redirect to SSO provider
    SSO->>U: Show university login
    U->>SSO: Enter credentials
    SSO->>SSO: Validate credentials
    SSO->>App: SAML response with user data
    
    App->>App: Validate SAML response
    App->>DB: Query/create user record
    DB-->>App: User data
    App->>Session: Create session
    Session-->>App: Session ID
    App->>App: Generate JWT token
    App-->>B: Set auth cookies + redirect
    B->>App: GET /dashboard (with session)
    App->>Session: Validate session
    Session-->>App: Session valid
    App->>DB: Get user permissions
    DB-->>App: Permission data
    App-->>B: Dashboard HTML/JSON
    B-->>U: Show dashboard
```

## 2. Inventory Management Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Inventory UI
    participant API as API Server
    participant Auth as Auth Service
    participant Inventory as Inventory Service
    participant DB as Database
    participant Audit as Audit Service

    U->>UI: Create new item
    UI->>API: POST /api/items
    API->>Auth: Verify JWT token
    Auth-->>API: User context
    API->>Auth: Check permissions (item.create)
    Auth-->>API: Permission granted
    
    API->>Inventory: Create item request
    Inventory->>Inventory: Validate item data
    Inventory->>DB: Check SKU uniqueness
    DB-->>Inventory: SKU available
    
    Inventory->>DB: BEGIN transaction
    Inventory->>DB: INSERT into items
    DB-->>Inventory: Item created (ID: 123)
    Inventory->>DB: INSERT into stock_movements
    DB-->>Inventory: Stock movement recorded
    Inventory->>DB: COMMIT transaction
    
    Inventory->>Audit: Log item creation
    Audit->>DB: INSERT audit log
    Inventory-->>API: Item created successfully
    API-->>UI: 201 Created + item data
    UI->>UI: Update item list
    UI-->>U: Show success message

    Note over U,Audit: Stock update triggers automatic audit trail
```

## 3. Order Processing Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Orders UI
    participant Upload as File Upload
    participant Parser as PDF Parser
    participant API as API Server
    participant Orders as Order Service
    participant Inventory as Inventory Service
    participant DB as Database
    participant Notification as Email Service

    U->>UI: Upload PDF invoice
    UI->>Upload: POST /api/upload/invoice
    Upload->>Parser: Parse PDF content
    Parser->>Parser: Extract order data
    Parser-->>Upload: Parsed order data
    Upload-->>UI: Show preview
    
    U->>UI: Confirm import
    UI->>API: POST /api/orders/import
    API->>Orders: Create order from parsed data
    Orders->>Orders: Validate order data
    Orders->>DB: BEGIN transaction
    
    Orders->>DB: INSERT into orders
    DB-->>Orders: Order created (O202501291234)
    
    loop For each order item
        Orders->>DB: INSERT into order_items
        Orders->>Inventory: Check/create item
        Inventory->>DB: Query existing item by SKU
        alt Item doesn't exist
            Inventory->>DB: INSERT into items
            DB-->>Inventory: New item created
        else Item exists
            Inventory->>DB: UPDATE item details
        end
        Inventory-->>Orders: Item ready
    end
    
    Orders->>DB: COMMIT transaction
    Orders-->>API: Order created successfully
    API-->>UI: 201 Created + order data
    
    Orders->>Notification: Send order confirmation
    Notification->>Notification: Generate email
    Notification-->>Orders: Email sent
    
    UI-->>U: Show order confirmation
    
    Note over U,Notification: PDF parsing enables automated order creation
```

## 4. Sales Transaction Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Sales UI
    participant API as API Server
    participant Sales as Sales Service
    parameter Inventory as Inventory Service
    participant Quote as Quote Service
    participant DB as Database
    participant Receipt as Receipt Service

    U->>UI: Convert quote to sale
    UI->>API: POST /api/quotes/123/convert
    API->>Quote: Get quote details
    Quote->>DB: SELECT quote and items
    DB-->>Quote: Quote data
    Quote-->>API: Quote details
    
    API->>Sales: Create sale from quote
    Sales->>Sales: Calculate VAT and totals
    Sales->>DB: BEGIN transaction
    
    Sales->>DB: INSERT into sales
    DB-->>Sales: Sale created (S202501291234)
    
    loop For each sale item
        Sales->>DB: INSERT into sale_items
        Sales->>Inventory: Check stock availability
        Inventory->>DB: SELECT current_stock
        DB-->>Inventory: Stock level
        
        alt Sufficient stock
            Inventory->>DB: UPDATE current_stock
            Inventory->>DB: INSERT stock_movement
            DB-->>Inventory: Stock updated
        else Insufficient stock
            Inventory-->>Sales: Stock shortage error
            Sales->>DB: ROLLBACK transaction
            Sales-->>API: Error response
            API-->>UI: Show error message
            UI-->>U: Stock shortage warning
        end
    end
    
    Sales->>Quote: Mark quote as processed
    Quote->>DB: UPDATE quote status
    Sales->>DB: COMMIT transaction
    
    Sales->>Receipt: Generate receipt
    Receipt->>Receipt: Create PDF receipt
    Receipt-->>Sales: Receipt URL
    
    Sales-->>API: Sale completed
    API-->>UI: 201 Created + sale data
    UI->>UI: Show receipt download
    UI-->>U: Transaction complete
    
    Note over U,Receipt: Automatic stock deduction and receipt generation
```

## 5. Quote Creation and Management Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Quote Builder
    participant API as API Server
    participant Quote as Quote Service
    participant Inventory as Inventory Service
    participant Session as Session Store
    participant DB as Database

    U->>UI: Start new quote
    UI->>API: POST /api/quotes/draft
    API->>Quote: Create draft quote
    Quote->>Quote: Generate session ID
    Quote->>DB: INSERT draft quote
    DB-->>Quote: Quote created (Q202501291234)
    Quote->>Session: Store quote session
    Session-->>Quote: Session saved
    Quote-->>API: Draft quote created
    API-->>UI: Quote data + session
    
    loop Add items to quote
        U->>UI: Search and add item
        UI->>Inventory: GET /api/items/search?q=laptop
        Inventory->>DB: Search items query
        DB-->>Inventory: Matching items
        Inventory-->>UI: Item results
        
        U->>UI: Select item and quantity
        UI->>API: PUT /api/quotes/123/items
        API->>Quote: Add item to quote
        Quote->>Quote: Calculate item totals
        Quote->>DB: UPDATE quote totals
        Quote->>DB: INSERT/UPDATE quote_items
        DB-->>Quote: Item added
        Quote-->>API: Updated quote
        API-->>UI: Updated totals
        UI->>UI: Refresh quote display
    end
    
    U->>UI: Save quote
    UI->>API: PUT /api/quotes/123/finalize
    API->>Quote: Finalize quote
    Quote->>Quote: Validate quote completeness
    Quote->>DB: UPDATE quote status = 'final'
    Quote->>Session: Clear draft session
    Quote-->>API: Quote finalized
    API-->>UI: Final quote data
    UI-->>U: Quote saved confirmation
    
    Note over U,Session: Session-based draft management allows resume
```

## 6. User Management and Permissions Sequence

```mermaid
sequenceDiagram
    participant Admin as Admin User
    participant UI as Admin UI
    participant API as API Server
    participant Auth as Auth Service
    participant User as User Service
    participant Permission as Permission Service
    parameter DB as Database
    participant Audit as Audit Service

    Admin->>UI: Create new user
    UI->>API: POST /api/users
    API->>Auth: Verify admin permissions
    Auth->>DB: Check user role and permissions
    DB-->>Auth: Admin confirmed
    Auth-->>API: Admin access granted
    
    API->>User: Create user request
    User->>User: Validate user data
    User->>DB: Check email uniqueness
    DB-->>User: Email available
    
    User->>DB: BEGIN transaction
    User->>DB: INSERT into users
    DB-->>User: User created (ID: user_456)
    
    User->>Permission: Assign default permissions
    Permission->>DB: SELECT default permissions for role
    DB-->>Permission: Default permission list
    
    loop For each default permission
        Permission->>DB: INSERT into user_permissions
        DB-->>Permission: Permission granted
    end
    
    User->>DB: COMMIT transaction
    User->>Audit: Log user creation
    Audit->>DB: INSERT audit log
    
    User-->>API: User created successfully
    API-->>UI: 201 Created + user data
    UI-->>Admin: Show user creation success
    
    Admin->>UI: Modify user permissions
    UI->>API: PUT /api/users/456/permissions
    API->>Permission: Update user permissions
    Permission->>DB: UPDATE user_permissions
    Permission->>Audit: Log permission change
    Audit->>DB: INSERT audit log
    Permission-->>API: Permissions updated
    API-->>UI: Permission change confirmed
    UI-->>Admin: Show permission update success
    
    Note over Admin,Audit: All user management actions are audited
```

## Sequence Diagram Insights

### **Common Patterns**

1. **Authentication Check**: Every API call validates user authentication and permissions
2. **Transaction Management**: Database operations use transactions for data consistency
3. **Audit Logging**: Critical actions are logged for compliance and debugging
4. **Error Handling**: Each sequence includes error paths and rollback mechanisms
5. **Real-time Updates**: UI updates reflect server-side changes immediately

### **Performance Optimizations**

1. **Bulk Operations**: Order processing handles multiple items in single transaction
2. **Caching**: Session store reduces database queries for user context
3. **Lazy Loading**: Item searches only fetch when needed
4. **Connection Pooling**: Database connections are reused across requests

### **Security Measures**

1. **Token Validation**: JWT tokens verified on every request
2. **Permission Checking**: Role-based access control enforced
3. **Input Validation**: All user input validated before processing
4. **Audit Trails**: Security-relevant actions logged for compliance

### **Data Consistency**

1. **ACID Transactions**: Multi-table operations use database transactions
2. **Stock Management**: Inventory changes trigger automatic audit records
3. **Referential Integrity**: Foreign key constraints maintain data relationships
4. **Optimistic Concurrency**: Race conditions handled with appropriate locking
