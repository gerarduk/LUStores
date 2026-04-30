# Network Flow Diagram

```mermaid
flowchart TD
    %% External Networks
    subgraph Internet["Internet 🌐"]
        Client[Client Browser]
        University[University SSO]
        CDN[CDN Resources]
        EmailProvider[Email Services]
    end
    
    %% Edge Layer
    subgraph Edge["Edge Layer"]
        LoadBalancer[Load Balancer<br/>📊 Traffic Distribution]
        SSL_Termination[SSL Termination<br/>🔐 HTTPS → HTTP]
        RateLimit[Rate Limiting<br/>⚡ DDoS Protection]
        Firewall[Web Application Firewall<br/>🛡️ Attack Prevention]
    end
    
    %% Application Layer
    subgraph AppLayer["Application Layer"]
        WebServer[Web Server<br/>🌐 Nginx/Express]
        AppServer1[App Server 1<br/>⚙️ Node.js Instance]
        AppServer2[App Server 2<br/>⚙️ Node.js Instance]
        SessionStore[Session Store<br/>💾 Redis/Memory]
        FileStorage[File Storage<br/>📁 Static Assets]
    end
    
    %% Database Layer
    subgraph DBLayer["Database Layer"]
        PrimaryDB[Primary Database<br/>🗄️ PostgreSQL Master]
        ReplicaDB[Read Replica<br/>📖 PostgreSQL Replica]
        BackupDB[Backup Storage<br/>💾 Automated Backups]
        ConnectionPool[Connection Pool<br/>🔗 pgBouncer]
    end
    
    %% Monitoring & Logging
    subgraph Monitoring["Monitoring & Observability"]
        Logger[Application Logger<br/>📝 Winston/Pino]
        Metrics[Metrics Collector<br/>📊 Prometheus]
        AlertManager[Alert Manager<br/>🚨 Notifications]
        LogStorage[Log Storage<br/>📚 ELK Stack]
    end
    
    %% Docker Infrastructure
    subgraph Docker["Container Infrastructure"]
        DockerHost[Docker Host<br/>🐳 Container Runtime]
        AppContainer1[App Container 1<br/>📦 lustore-app:latest]
        AppContainer2[App Container 2<br/>📦 lustore-app:latest]
        DBContainer[DB Container<br/>🗄️ postgres:15]
        NginxContainer[Nginx Container<br/>🌐 nginx:alpine]
    end
    
    %% Network Flows
    Client -->|HTTPS:443| LoadBalancer
    University -->|SAML/OAuth| LoadBalancer
    CDN -->|Static Assets| Client
    
    LoadBalancer --> SSL_Termination
    SSL_Termination --> RateLimit
    RateLimit --> Firewall
    Firewall --> WebServer
    
    WebServer --> AppServer1
    WebServer --> AppServer2
    AppServer1 --> SessionStore
    AppServer2 --> SessionStore
    AppServer1 --> FileStorage
    AppServer2 --> FileStorage
    
    AppServer1 --> ConnectionPool
    AppServer2 --> ConnectionPool
    ConnectionPool --> PrimaryDB
    ConnectionPool --> ReplicaDB
    PrimaryDB --> BackupDB
    
    AppServer1 --> Logger
    AppServer2 --> Logger
    Logger --> LogStorage
    AppServer1 --> Metrics
    AppServer2 --> Metrics
    Metrics --> AlertManager
    AlertManager -->|Email/SMS| EmailProvider
    
    %% Docker Mappings
    WebServer -.-> NginxContainer
    AppServer1 -.-> AppContainer1
    AppServer2 -.-> AppContainer2
    PrimaryDB -.-> DBContainer
    
    %% Network Protocols and Ports
    subgraph Protocols["Network Protocols & Ports"]
        HTTPS_443[HTTPS:443<br/>🔐 Encrypted Web Traffic]
        HTTP_80[HTTP:80<br/>🌐 Internal Web Traffic]
        DB_5432[PostgreSQL:5432<br/>🗄️ Database Connection]
        Redis_6379[Redis:6379<br/>💾 Session Storage]
        SSH_22[SSH:22<br/>🔧 Administrative Access]
        SMTP_587[SMTP:587<br/>📧 Email Notifications]
    end
    
    %% Security Zones
    subgraph DMZ["DMZ Zone"]
        LoadBalancer
        SSL_Termination
        RateLimit
        Firewall
        WebServer
    end
    
    subgraph Internal["Internal Network"]
        AppServer1
        AppServer2
        SessionStore
        FileStorage
        ConnectionPool
    end
    
    subgraph Database["Database Zone"]
        PrimaryDB
        ReplicaDB
        BackupDB
    end
    
    %% Data Flow Annotations
    Client -.->|"1. User Request<br/>GET/POST/PUT/DELETE"| LoadBalancer
    LoadBalancer -.->|"2. Route to Server<br/>Round Robin/Least Conn"| WebServer
    WebServer -.->|"3. Proxy to App<br/>HTTP Upstream"| AppServer1
    AppServer1 -.->|"4. Database Query<br/>SQL via ORM"| ConnectionPool
    ConnectionPool -.->|"5. Execute Query<br/>Read/Write Split"| PrimaryDB
    PrimaryDB -.->|"6. Return Data<br/>Result Set"| ConnectionPool
    ConnectionPool -.->|"7. Response Data<br/>JSON/HTML"| AppServer1
    AppServer1 -.->|"8. HTTP Response<br/>Status + Data"| WebServer
    WebServer -.->|"9. Client Response<br/>HTTPS Encrypted"| LoadBalancer
    LoadBalancer -.->|"10. Final Response<br/>Browser Render"| Client
    
    %% Styling
    classDef internet fill:#ffebee,stroke:#c62828
    classDef edge fill:#e3f2fd,stroke:#1976d2
    classDef app fill:#e8f5e8,stroke:#388e3c
    classDef database fill:#f3e5f5,stroke:#7b1fa2
    classDef monitoring fill:#fff3e0,stroke:#f57c00
    classDef docker fill:#e0f2f1,stroke:#00796b
    classDef protocols fill:#fce4ec,stroke:#c2185b
    classDef dmz fill:#fff8e1,stroke:#f9a825
    classDef internal fill:#e1f5fe,stroke:#0288d1
    classDef dbzone fill:#f1f8e9,stroke:#689f38
    
    class Internet internet
    class Edge edge
    class AppLayer app
    class DBLayer database
    class Monitoring monitoring
    class Docker docker
    class Protocols protocols
    class DMZ dmz
    class Internal internal
    class Database dbzone
```

## Network Architecture Components

### **Internet Layer**
- **Client Browsers**: End user access via modern web browsers
- **University SSO**: External identity provider integration
- **CDN**: Content delivery network for static assets
- **Email Services**: External SMTP for notifications

### **Edge Layer (DMZ)**
- **Load Balancer**: Traffic distribution and high availability
- **SSL Termination**: HTTPS certificate handling and encryption
- **Rate Limiting**: API throttling and abuse prevention
- **Web Application Firewall**: Layer 7 attack protection

### **Application Layer (Internal Network)**
- **Web Server**: Nginx reverse proxy and static content
- **Application Servers**: Node.js instances with load balancing
- **Session Store**: Redis/in-memory session management
- **File Storage**: Document and asset storage system

### **Database Layer (Secure Zone)**
- **Primary Database**: PostgreSQL master for writes
- **Read Replica**: PostgreSQL replica for read scaling
- **Backup Storage**: Automated backup and recovery
- **Connection Pooling**: Database connection optimization

### **Monitoring & Observability**
- **Application Logging**: Structured logging with Winston/Pino
- **Metrics Collection**: Prometheus-compatible metrics
- **Alerting**: Automated incident response
- **Log Aggregation**: Centralized log analysis

## Network Security

### **Security Zones**
1. **DMZ Zone**: Public-facing services with restricted access
2. **Internal Network**: Application services with controlled access
3. **Database Zone**: Highly restricted data layer access

### **Network Protocols**
- **HTTPS (443)**: Encrypted client communication
- **HTTP (80)**: Internal service communication
- **PostgreSQL (5432)**: Database connections
- **Redis (6379)**: Session storage access
- **SSH (22)**: Administrative access
- **SMTP (587)**: Email notifications

### **Traffic Flow Security**
1. **Ingress Filtering**: Only allowed protocols and ports
2. **SSL/TLS Encryption**: End-to-end encryption
3. **Internal Segmentation**: Network isolation between layers
4. **Database Access Control**: Restricted database connectivity
5. **Monitoring & Logging**: All network activity logged

## High Availability & Scaling

### **Load Balancing**
- **Algorithm**: Round-robin or least connections
- **Health Checks**: Automatic failure detection
- **Session Affinity**: Sticky sessions when needed
- **SSL Passthrough**: Certificate handling options

### **Horizontal Scaling**
- **Application Servers**: Multiple Node.js instances
- **Database Replicas**: Read scaling capabilities
- **Container Orchestration**: Docker Swarm/Kubernetes ready
- **Auto-scaling**: Traffic-based scaling triggers

### **Failover Mechanisms**
- **Database Failover**: Primary to replica promotion
- **Application Failover**: Automatic server replacement
- **Session Persistence**: Redis clustering for session HA
- **Backup & Recovery**: Automated disaster recovery

## Performance Optimization

### **Caching Strategy**
- **CDN Caching**: Static asset distribution
- **Application Caching**: Redis/memory caching
- **Database Query Caching**: ORM-level caching
- **Browser Caching**: HTTP cache headers

### **Connection Management**
- **Keep-Alive Connections**: HTTP connection reuse
- **Connection Pooling**: Database connection efficiency
- **Compression**: Gzip/Brotli response compression
- **Minification**: CSS/JS optimization

### **Monitoring Points**
- **Response Times**: End-to-end latency tracking
- **Throughput**: Requests per second metrics
- **Error Rates**: 4xx/5xx error monitoring
- **Resource Usage**: CPU, memory, disk utilization
