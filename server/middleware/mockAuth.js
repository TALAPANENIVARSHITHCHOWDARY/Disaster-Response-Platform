import { logger } from '../utils/logger.js';

// Mock users for demonstration
const MOCK_USERS = {
  'netrunnerX': {
    id: 'netrunnerX',
    name: 'NetRunner X',
    role: 'admin',
    permissions: ['create', 'read', 'update', 'delete']
  },
  'reliefAdmin': {
    id: 'reliefAdmin',
    name: 'Relief Administrator',
    role: 'admin',
    permissions: ['create', 'read', 'update', 'delete']
  },
  'fieldWorker': {
    id: 'fieldWorker',
    name: 'Field Worker',
    role: 'contributor',
    permissions: ['create', 'read', 'update']
  },
  'volunteer': {
    id: 'volunteer',
    name: 'Volunteer',
    role: 'contributor',
    permissions: ['create', 'read']
  }
};

export function mockAuth(req, res, next) {
  // Simple mock authentication - in production, use proper JWT or session auth
  const authHeader = req.headers.authorization;
  let userId = 'netrunnerX'; // default user
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // In a real app, decode and verify JWT token
    if (MOCK_USERS[token]) {
      userId = token;
    }
  }
  
  // Check for user_id in query params (for testing)
  if (req.query.user_id && MOCK_USERS[req.query.user_id]) {
    userId = req.query.user_id;
  }
  
  const user = MOCK_USERS[userId];
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  req.user = user;
  logger.debug(`Request authenticated as: ${user.name} (${user.role})`);
  next();
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions.includes(permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}