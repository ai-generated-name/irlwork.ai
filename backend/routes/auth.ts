import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma, JWT_SECRET } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role = 'human' } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Generate API key for agents
    const apiKey = role === 'agent' ? `hw_${uuidv4().replace(/-/g, '')}` : null;
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role,
        apiKey,
        apiKeyLabel: role === 'agent' ? 'Default API Key' : null,
        profile: role === 'human' ? {
          create: {}
        } : undefined,
        wallet: {
          create: { balance: 0 }
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        apiKey: true,
        createdAt: true
      }
    });
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: 'Registration successful',
      user,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, apiKey } = req.body;
    
    // Can login with email+password or API key (for agents)
    let user;
    
    if (apiKey) {
      user = await prisma.user.findUnique({
        where: { apiKey },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          passwordHash: true,
          isVerified: true
        }
      });
    } else {
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          passwordHash: true,
          isVerified: true
        }
      });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password if using email login
    if (!apiKey) {
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        isVerified: true,
        bio: true,
        hourlyRate: true,
        skills: true,
        location: true,
        timezone: true,
        profile: true,
        createdAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Regenerate API key (agents only)
router.post('/regenerate-api-key', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'agent') {
      return res.status(403).json({ error: 'Agents only' });
    }
    
    const { label } = req.body;
    const newApiKey = `hw_${uuidv4().replace(/-/g, '')}`;
    
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        apiKey: newApiKey,
        apiKeyLabel: label || 'Regenerated API Key'
      },
      select: {
        id: true,
        apiKey: true,
        apiKeyLabel: true
      }
    });
    
    res.json({
      message: 'API key regenerated',
      apiKey: user.apiKey,
      label: user.apiKeyLabel
    });
  } catch (error) {
    console.error('API key regeneration error:', error);
    res.status(500).json({ error: 'Failed to regenerate API key' });
  }
});

export default router;
