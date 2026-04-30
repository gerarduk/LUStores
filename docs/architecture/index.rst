System Architecture Diagrams
============================

This section provides comprehensive architectural diagrams for the LUStores University Inventory Management System. These diagrams offer different perspectives on the system architecture, data flow, and operational workflows to help understand the system design and implementation.

Overview
--------

The architectural diagrams are organized by perspective and audience:

- **Data Architecture**: Database design and relationships
- **System Architecture**: Overall system structure and components  
- **Application Architecture**: Frontend component organization
- **Security Architecture**: Authentication and authorization flows
- **Infrastructure Architecture**: Network and deployment design
- **Process Architecture**: User workflows and business processes

Database Entity Relationships
-----------------------------

The **Entity Relationship Diagram (ERD)** shows the complete database schema with all tables, relationships, and constraints.

.. mermaid::

   erDiagram
       %% Core User Management
       users ||--o{ user_permissions : "has permissions"
       users ||--o{ items : "creates/updates"
       users ||--o{ stock_movements : "performs"
       users ||--o{ sales : "processes"
       users ||--o{ quotes : "creates/processes"
       users ||--o{ orders : "creates/receives"
       users ||--o{ chargecodes : "authorises"
       users ||--o{ charge_code_exclusions : "creates"
       users ||--o{ notes : "creates"
       
       %% Permission System
       permission_definitions ||--o{ user_permissions : "defines"
       
       %% Category System
       categories ||--o{ items : "categorizes"
       categories ||--o{ order_items : "applies to"
       categories ||--o{ charge_code_exclusions : "excludes"
       
       %% Item Management
       items ||--o{ stock_movements : "tracks changes"
       items ||--o{ sale_items : "sold as"
       items ||--o{ quote_items : "quoted as"
       items ||--o{ order_items : "ordered as"
       items ||--o{ sources : "supplied by"
       
       %% Supplier Relationships
       suppliers ||--o{ sources : "supplies items"
       suppliers ||--o{ orders : "receives orders"
       
       %% Sales System
       sales ||--o{ sale_items : "contains"
       
       %% Quote System  
       quotes ||--o{ quote_items : "contains"
       
       %% Order Management
       orders ||--o{ order_items : "contains"
       
       %% Charge Codes
       chargecodes ||--o{ charge_code_exclusions : "has exclusions"
       chargecodes ||--o{ sales : "charged to"
       chargecodes ||--o{ quotes : "charged to"

       users {
           string id PK
           string email UK
           string password_hash "nullable"
           string first_name
           string last_name
           string role "default: user"
           boolean is_active "default: true"
           timestamp created_at
           timestamp updated_at
       }
       
       categories {
           serial id PK
           string name UK
           string description
           string icon "default: fas fa-box"
           string color "default: blue"
           timestamp created_at
           timestamp updated_at
       }
       
       items {
           serial id PK
           string name
           string sku UK
           string description
           integer category_id FK
           decimal price
           decimal vat_rate "default: 0.2000"
           boolean vat_included "default: true"
           integer current_stock "default: 0"
           integer minimum_stock "default: 0"
           boolean is_active "default: true"
           integer notes_id FK
           string created_by FK
           string updated_by FK
           timestamp created_at
           timestamp updated_at
       }

**Key Database Features:**

- **Referential Integrity**: Foreign key constraints maintain data consistency
- **Audit Trails**: Timestamp tracking and user attribution for all changes
- **Soft Deletes**: Items marked inactive rather than deleted for history preservation
- **Polymorphic Notes**: Single notes table references any entity type
- **Permission System**: Granular role-based access control

.. seealso::
   :doc:`../reference/database-schema` for detailed table specifications

System Architecture Flow  
------------------------

The **system architecture diagram** shows the complete technology stack from client to database with all major components and their relationships.

.. mermaid::

   flowchart TD
       subgraph Client["Client Layer (React + TypeScript)"]
           Browser[Web Browser]
           React[React SPA]
           TanStack[TanStack Query]
           UI[Shadcn/UI Components]
       end
       
       subgraph Server["Server Layer (Node.js + Express)"]
           Express[Express Server]
           Routes[Route Handlers]
           AuthService[Authentication Service]
           Storage[Storage Layer]
       end
       
       subgraph AuthSystems["Authentication Systems"]
           LocalAuth[Local Authentication]
           SAML[SAML 2.0 SSO]
           UniversitySSO[University SSO]
       end
       
       subgraph Database["Database Layer (PostgreSQL)"]
           PG[PostgreSQL Database]
           Tables[Database Tables]
           Indexes[Indexes & Constraints]
       end
       
       Client --> Server
       Server --> AuthSystems
       Server --> Database

**Architecture Principles:**

- **Separation of Concerns**: Clear boundaries between presentation, business logic, and data layers
- **Security First**: Multiple authentication methods and comprehensive permission system
- **Type Safety**: TypeScript throughout the entire stack
- **Performance**: Connection pooling, query optimization, and intelligent caching
- **Scalability**: Microservice-ready architecture with horizontal scaling support

Application Component Flow
-------------------------

The **frontend component hierarchy** shows React component relationships and data flow patterns throughout the user interface.

.. mermaid::

   flowchart TD
       subgraph App["Main Application"]
           AppRoot[App Root Component]
           Router[React Router]
           AuthProvider[Authentication Provider]
           QueryClient[TanStack Query Client]
       end
       
       subgraph Pages["Page Components"]
           Dashboard[Dashboard Page]
           Inventory[Inventory Page]
           Orders[Orders Page]
           Sales[Sales Page]
           Quotes[Quotes Page]
       end
       
       subgraph SharedUI["Shared UI Components"]
           Dialog[Dialog/Modal]
           Table[Data Table]
           Form[Form Components]
           Button[Button Components]
       end
       
       subgraph DataHooks["Data Management Hooks"]
           useItems[useItems Hook]
           useOrders[useOrders Hook]
           useSales[useSales Hook]
           useQuotes[useQuotes Hook]
       end
       
       App --> Pages
       Pages --> SharedUI
       Pages --> DataHooks

**Component Design Patterns:**

- **Container/Presentational**: Separation of data logic from UI presentation
- **Compound Components**: Complex UI components built from smaller, reusable parts
- **Custom Hooks**: Encapsulated data fetching and state management logic
- **Provider Pattern**: Context-based state sharing across component trees

Authentication Flow
------------------

The **authentication workflow** diagram shows all supported login methods and security processes.

.. mermaid::

   flowchart TD
       subgraph Entry["User Entry Points"]
           Browser[Web Browser]
           LoginPage[Login Page]
       end
       
       subgraph AuthMethods["Authentication Methods"]
           LocalAuth[Local Authentication]
           UniversitySSO[University SSO]
           SAML_Auth[SAML 2.0 SSO]
       end
       
       subgraph SessionMgmt["Session Management"]
           SessionStore[Session Storage]
           TokenRefresh[Token Refresh]
           PermissionCheck[Permission Verification]
       end
       
       subgraph Success["Successful Authentication"]
           UserContext[User Context Provider]
           AppDashboard[Application Dashboard]
       end
       
       Entry --> AuthMethods
       AuthMethods --> SessionMgmt
       SessionMgmt --> Success

**Security Features:**

- **Multi-Provider Authentication**: Local, SSO, and SAML 2.0 support
- **Session Security**: HTTP-only cookies, CSRF protection, secure transmission
- **Permission System**: Role-based access control with granular permissions
- **Audit Logging**: Comprehensive security event tracking

Data Flow Diagram
-----------------

The **data flow diagram** illustrates how information moves through system layers during key business operations.

.. mermaid::

   flowchart TD
       subgraph UI["User Interface Layer"]
           DashboardUI[📊 Dashboard]
           InventoryUI[📦 Inventory Management]
           OrdersUI[📋 Orders Management]
           SalesUI[💰 Sales Processing]
       end
       
       subgraph Business["Business Logic Layer"]
           AuthService[🔒 Authentication Service]
           InventoryService[📦 Inventory Service]
           OrderService[📋 Order Service]
           SalesService[💰 Sales Service]
       end
       
       subgraph DataAccess["Data Access Layer"]
           UserRepo[👤 User Repository]
           ItemRepo[📦 Item Repository]
           OrderRepo[📋 Order Repository]
           SalesRepo[💰 Sales Repository]
       end
       
       subgraph Database["Database Layer"]
           UserTables[(👤 Users & Permissions)]
           InventoryTables[(📦 Items & Categories)]
           TransactionTables[(💰 Sales & Quotes)]
           OrderTables[(📋 Orders & Suppliers)]
       end
       
       UI --> Business
       Business --> DataAccess
       DataAccess --> Database

**Data Processing Features:**

- **Input Validation**: Multi-layer validation from client to database
- **Business Rule Enforcement**: Complex business logic handled at service layer
- **Transaction Management**: ACID compliance for multi-table operations
- **Audit Trail Generation**: Automatic logging of all significant data changes

Network Flow Diagram
--------------------

The **network architecture** shows infrastructure components, traffic flow, and security zones.

.. mermaid::

   flowchart TD
       subgraph Internet["Internet 🌐"]
           Client[Client Browser]
           University[University SSO]
       end
       
       subgraph Edge["Edge Layer"]
           LoadBalancer[Load Balancer<br/>Traffic Distribution]
           SSL_Termination[SSL Termination<br/>HTTPS to HTTP]
           Firewall[Web Application Firewall<br/>Attack Prevention]
       end
       
       subgraph AppLayer["Application Layer"]
           WebServer[Web Server<br/>Nginx/Express]
           AppServer1[App Server 1<br/>Node.js Instance]
           AppServer2[App Server 2<br/>Node.js Instance]
       end
       
       subgraph DBLayer["Database Layer"]
           PrimaryDB[Primary Database<br/>PostgreSQL Master]
           ReplicaDB[Read Replica<br/>PostgreSQL Replica]
       end
       
       Internet --> Edge
       Edge --> AppLayer
       AppLayer --> DBLayer

**Network Security:**

- **DMZ Architecture**: Public-facing services isolated from internal systems
- **SSL/TLS Encryption**: End-to-end encryption for all client communication  
- **Network Segmentation**: Layered security with restricted inter-zone access
- **Load Balancing**: High availability with automatic failover capabilities

Deployment Architecture
----------------------

The **deployment diagram** shows infrastructure across development, staging, and production environments.

.. mermaid::

   flowchart TD
       subgraph Dev["Development Environment"]
           DevMachine[Developer Machine]
           DevDocker[Docker Desktop]
           DevDB[Local PostgreSQL]
       end
       
       subgraph CICD["CI/CD Pipeline"]
           GitHub[GitHub Repository]
           Actions[GitHub Actions]
           Registry[Container Registry]
       end
       
       subgraph Prod["Production Environment"]
           ProdLB[Production Load Balancer]
           ProdApp1[App Server 1]
           ProdApp2[App Server 2]
           ProdDB[Production Database]
       end
       
       subgraph Monitor["Monitoring"]
           Prometheus[Prometheus]
           Grafana[Grafana]
           AlertManager[Alert Manager]
       end
       
       Dev --> CICD
       CICD --> Prod
       Monitor --> Prod

**Deployment Strategy:**

- **Containerization**: Docker containers for consistent deployment across environments
- **Blue-Green Deployment**: Zero-downtime deployments with instant rollback capability  
- **Infrastructure as Code**: Terraform and automated provisioning
- **Monitoring Integration**: Comprehensive observability with Prometheus and Grafana

User Workflow Sequences
-----------------------

The **sequence diagrams** show step-by-step interactions for key business processes.

**Authentication Sequence:**

.. mermaid::

   sequenceDiagram
       participant U as User
       participant App as Application
       participant SSO as University SSO
       participant DB as Database

       U->>App: Access application
       App-->>U: Redirect to login
       U->>App: Select SSO login
       App->>SSO: Redirect to SSO provider
       SSO->>U: Show university login
       U->>SSO: Enter credentials
       SSO->>App: SAML response with user data
       App->>DB: Query/create user record
       DB-->>App: User data
       App-->>U: Show dashboard

**Order Processing Sequence:**

.. mermaid::

   sequenceDiagram
       participant U as User
       participant UI as Orders UI
       participant API as API Server
       participant Orders as Order Service
       participant DB as Database

       U->>UI: Upload PDF invoice
       UI->>API: POST /api/orders/import
       API->>Orders: Create order from parsed data
       Orders->>DB: INSERT order and items
       Orders-->>API: Order created successfully
       API-->>UI: 201 Created + order data
       UI-->>U: Show order confirmation

**Workflow Characteristics:**

- **Error Handling**: Comprehensive error paths and rollback mechanisms
- **Transaction Safety**: Database transactions ensure data consistency
- **Real-time Updates**: UI immediately reflects server-side changes
- **Audit Integration**: All significant actions logged for compliance

Using the Diagrams
------------------

**For Software Architects:**
   Start with the System Architecture Flow for overall understanding, then drill down into specific areas using the specialized diagrams.

**For Developers:**
   Reference the Application Component Flow for frontend work and Sequence Diagrams for business logic implementation.

**For DevOps Engineers:**
   Focus on the Deployment and Network Flow diagrams for infrastructure planning and configuration.

**For Business Stakeholders:**
   Use the Data Flow and Sequence diagrams to understand business processes and system capabilities.

.. note::
   All diagrams are created using Mermaid syntax and are version-controlled as text files in the ``/diagrams`` directory. They can be easily updated and automatically render in most documentation platforms.

.. seealso::
   - :doc:`../development/architecture` for detailed architecture documentation
   - :doc:`../reference/database-schema` for complete database specifications
   - :doc:`../deployment/production` for production deployment guides
