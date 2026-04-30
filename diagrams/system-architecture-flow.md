# System Architecture Flow Diagram

```mermaid
flowchart TD
    %% Client Layer
    subgraph Client["Client Layer (React + TypeScript)"]
        Browser[Web Browser]
        React[React SPA]
        Router[React Router]
        TanStack[TanStack Query]
        Forms[React Hook Form]
        UI[Shadcn/UI Components]
        Auth[Auth Utils]
        
        Browser --> React
        React --> Router
        React --> TanStack
        React --> Forms
        React --> UI
        React --> Auth
    end
    
    %% Network Layer
    subgraph Network["Network Layer"]
        HTTPS[HTTPS/TLS]
        API[REST API Calls]
        WebSocket[WebSocket Connection]
        
        Client --> HTTPS
        HTTPS --> API
        HTTPS --> WebSocket
    end
    
    %% Server Layer
    subgraph Server["Server Layer (Node.js + Express)"]
        Express[Express Server]
        Routes[Route Handlers]
        Middleware[Middleware Stack]
        Auth_Server[Authentication]
        Permissions[Permission System]
        Storage[Storage Layer]
        
        Express --> Routes
        Express --> Middleware
        Routes --> Auth_Server
        Routes --> Permissions
        Routes --> Storage
    end
    
    %% Authentication Systems
    subgraph AuthSystems["Authentication Systems"]
        LocalAuth[Local Authentication]
        SAML[SAML 2.0 SSO]
        ReplitAuth[Replit Auth]
        UniversitySSO[University SSO]
        
        Auth_Server --> LocalAuth
        Auth_Server --> SAML
        Auth_Server --> ReplitAuth
        Auth_Server --> UniversitySSO
    end
    
    %% Data Access Layer
    subgraph DataLayer["Data Access Layer"]
        ORM[Drizzle ORM]
        Pool[Connection Pool]
        Migrations[Migration System]
        Referential[Referential Integrity]
        
        Storage --> ORM
        ORM --> Pool
        ORM --> Migrations
        ORM --> Referential
    end
    
    %% Database Layer
    subgraph Database["Database Layer (PostgreSQL)"]
        PG[PostgreSQL Database]
        Tables[Database Tables]
        Indexes[Indexes & Constraints]
        Triggers[Triggers & Procedures]
        
        Pool --> PG
        PG --> Tables
        PG --> Indexes
        PG --> Triggers
    end
    
    %% External Services
    subgraph External["External Services"]
        PDFParser[PDF Invoice Parser]
        FileUpload[File Upload Service]
        EmailService[Email Notifications]
        
        Routes --> PDFParser
        Routes --> FileUpload
        Routes --> EmailService
    end
    
    %% Development & Deployment
    subgraph DevOps["Development & Operations"]
        Docker[Docker Containers]
        CI_CD[CI/CD Pipeline]
        Testing[Testing Framework]
        Monitoring[System Monitoring]
        
        Server -.-> Docker
        Docker -.-> CI_CD
        Server -.-> Testing
        Server -.-> Monitoring
    end
    
    %% Data Flow Arrows
    Network --> Server
    DataLayer --> Database
    Server --> External
    
    %% Styling
    classDef client fill:#e1f5fe
    classDef server fill:#f3e5f5
    classDef database fill:#e8f5e8
    classDef external fill:#fff3e0
    classDef devops fill:#fce4ec
    
    class Client client
    class Server server
    class Database database
    class External external
    class DevOps devops
```

## Architecture Components

### Client Layer (Frontend)
- **React SPA**: Single Page Application with modern React features
- **React Router**: Client-side routing and navigation
- **TanStack Query**: Server state management, caching, and synchronization
- **React Hook Form**: Form handling with validation
- **Shadcn/UI**: Consistent component library with Tailwind CSS
- **Auth Utils**: Client-side authentication helpers

### Network Layer
- **HTTPS/TLS**: Secure communication protocol
- **REST API**: RESTful API endpoints for data operations  
- **WebSocket**: Real-time communication (optional for future features)

### Server Layer (Backend)
- **Express Server**: Node.js web framework
- **Route Handlers**: API endpoint implementations
- **Middleware Stack**: Authentication, logging, error handling
- **Authentication**: Multi-provider auth system
- **Permission System**: Role-based access control
- **Storage Layer**: Data access abstraction

### Authentication Systems
- **Local Authentication**: Username/password with JWT
- **SAML 2.0 SSO**: Enterprise single sign-on
- **Replit Auth**: Replit platform integration
- **University SSO**: Academic institution integration

### Data Access Layer
- **Drizzle ORM**: Type-safe database operations
- **Connection Pool**: Efficient database connections
- **Migration System**: Schema version control
- **Referential Integrity**: Data consistency management

### Database Layer
- **PostgreSQL**: Primary data store
- **Database Tables**: Normalized relational schema
- **Indexes & Constraints**: Performance and integrity
- **Triggers & Procedures**: Business logic enforcement

### External Services
- **PDF Invoice Parser**: Document processing for orders
- **File Upload Service**: Asset and document management
- **Email Notifications**: User communication

### Development & Operations
- **Docker Containers**: Containerized deployment
- **CI/CD Pipeline**: Automated testing and deployment
- **Testing Framework**: Unit, integration, and E2E tests
- **System Monitoring**: Health checks and performance tracking

## Key Design Principles

1. **Separation of Concerns**: Clear boundaries between layers
2. **Type Safety**: TypeScript throughout the stack
3. **Security First**: Multiple authentication methods, permission system
4. **Performance**: Connection pooling, query optimization, caching
5. **Maintainability**: Clean architecture, consistent patterns
6. **Scalability**: Microservice-ready, database optimization
7. **Reliability**: Error handling, referential integrity, audit trails
