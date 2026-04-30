const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'local-replit-jwt-secret';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:5000';

// Middleware
app.use(cors({
  origin: ALLOWED_ORIGINS.split(','),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock user database for local development
const mockUsers = [
  {
    sub: '927070657',
    email: 'admin@university.edu',
    first_name: 'University',
    last_name: 'Admin',
    profile_image_url: 'https://via.placeholder.com/100x100?text=UA',
    role: 'admin'
  },
  {
    sub: '927070658',
    email: 'manager@university.edu',
    first_name: 'Department',
    last_name: 'Manager',
    profile_image_url: 'https://via.placeholder.com/100x100?text=DM',
    role: 'superuser'
  },
  {
    sub: '927070659',
    email: 'user@university.edu',
    first_name: 'Regular',
    last_name: 'User',
    profile_image_url: 'https://via.placeholder.com/100x100?text=RU',
    role: 'user'
  }
];

// OIDC Discovery endpoint
app.get('/oidc/.well-known/openid_configuration', (req, res) => {
  res.json({
    issuer: `http://localhost:${PORT}/oidc`,
    authorization_endpoint: `http://localhost:${PORT}/oidc/authorize`,
    token_endpoint: `http://localhost:${PORT}/oidc/token`,
    userinfo_endpoint: `http://localhost:${PORT}/oidc/userinfo`,
    jwks_uri: `http://localhost:${PORT}/oidc/jwks`,
    end_session_endpoint: `http://localhost:${PORT}/oidc/logout`,
    scopes_supported: ['openid', 'email', 'profile', 'offline_access'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['HS256']
  });
});

// Authorization endpoint
app.get('/oidc/authorize', (req, res) => {
  const { client_id, redirect_uri, scope, state, response_type } = req.query;
  
  if (response_type !== 'code') {
    return res.status(400).json({ error: 'unsupported_response_type' });
  }

  // Generate authorization code
  const authCode = jwt.sign(
    { 
      client_id,
      redirect_uri,
      scope,
      user_id: mockUsers[0].sub // Default to admin user
    },
    JWT_SECRET,
    { expiresIn: '10m' }
  );

  // Redirect back to application with code
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', authCode);
  if (state) redirectUrl.searchParams.set('state', state);

  res.redirect(redirectUrl.toString());
});

// Token endpoint
app.post('/oidc/token', (req, res) => {
  const { grant_type, code, client_id, redirect_uri, refresh_token } = req.body;

  if (grant_type === 'authorization_code') {
    try {
      const decoded = jwt.verify(code, JWT_SECRET);
      const user = mockUsers.find(u => u.sub === decoded.user_id);
      
      if (!user) {
        return res.status(400).json({ error: 'invalid_grant' });
      }

      // Generate tokens
      const accessToken = jwt.sign(
        { sub: user.sub, email: user.email, scope: decoded.scope },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const idToken = jwt.sign(
        {
          sub: user.sub,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          profile_image_url: user.profile_image_url,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          aud: client_id,
          iss: `http://localhost:${PORT}/oidc`
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const refreshTokenValue = jwt.sign(
        { sub: user.sub, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        id_token: idToken,
        refresh_token: refreshTokenValue,
        scope: decoded.scope
      });
    } catch (error) {
      res.status(400).json({ error: 'invalid_grant' });
    }
  } else if (grant_type === 'refresh_token') {
    try {
      const decoded = jwt.verify(refresh_token, JWT_SECRET);
      if (decoded.type !== 'refresh') {
        return res.status(400).json({ error: 'invalid_grant' });
      }

      const user = mockUsers.find(u => u.sub === decoded.sub);
      if (!user) {
        return res.status(400).json({ error: 'invalid_grant' });
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { sub: user.sub, email: user.email },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600
      });
    } catch (error) {
      res.status(400).json({ error: 'invalid_grant' });
    }
  } else {
    res.status(400).json({ error: 'unsupported_grant_type' });
  }
});

// User info endpoint
app.get('/oidc/userinfo', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'invalid_token' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = mockUsers.find(u => u.sub === decoded.sub);
    
    if (!user) {
      return res.status(401).json({ error: 'invalid_token' });
    }

    res.json({
      sub: user.sub,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      profile_image_url: user.profile_image_url
    });
  } catch (error) {
    res.status(401).json({ error: 'invalid_token' });
  }
});

// JWKS endpoint (simplified for local development)
app.get('/oidc/jwks', (req, res) => {
  res.json({
    keys: [{
      kty: 'oct',
      use: 'sig',
      alg: 'HS256',
      k: Buffer.from(JWT_SECRET).toString('base64url')
    }]
  });
});

// Logout endpoint
app.get('/oidc/logout', (req, res) => {
  const { post_logout_redirect_uri } = req.query;
  if (post_logout_redirect_uri) {
    res.redirect(post_logout_redirect_uri);
  } else {
    res.json({ message: 'Logged out successfully' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'local-replit-auth',
    users: mockUsers.length
  });
});

// User selection endpoint for development
app.get('/dev/users', (req, res) => {
  res.json({
    available_users: mockUsers.map(u => ({
      id: u.sub,
      email: u.email,
      name: `${u.first_name} ${u.last_name}`,
      role: u.role
    }))
  });
});

// Switch user endpoint for development
app.post('/dev/switch-user/:userId', (req, res) => {
  const { userId } = req.params;
  const user = mockUsers.find(u => u.sub === userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // For development, we'll just return the user info
  // In a real implementation, this would update session state
  res.json({
    message: 'User switched successfully',
    user: {
      id: user.sub,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      role: user.role
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🔐 Local Replit Auth Service running on port ${PORT}`);
  console.log(`📋 Available test users:`);
  mockUsers.forEach(user => {
    console.log(`   - ${user.email} (${user.role})`);
  });
  console.log(`🔧 Development endpoints:`);
  console.log(`   - GET /dev/users - List available users`);
  console.log(`   - POST /dev/switch-user/:userId - Switch active user`);
  console.log(`   - GET /health - Service health check`);
});