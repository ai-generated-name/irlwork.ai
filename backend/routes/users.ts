import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all humans (workers)
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { 
      skills, 
      minRate, 
      maxRate, 
      location, 
      search,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const where: any = { role: 'human' };
    
    if (skills) {
      where.skills = { contains: skills as string };
    }
    
    if (minRate || maxRate) {
      where.hourlyRate = {};
      if (minRate) where.hourlyRate.gte = parseFloat(minRate as string);
      if (maxRate) where.hourlyRate.lte = parseFloat(maxRate as string);
    }
    
    if (location) {
      where.location = { contains: location as string };
    }
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          bio: true,
          hourlyRate: true,
          skills: true,
          location: true,
          timezone: true,
          profile: {
            select: {
              title: true,
              description: true,
              rating: true,
              reviewCount: true,
              completedJobs: true,
              responseTime: true
            }
          },
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.user.count({ where })
    ]);
    
    // Filter by search term if provided
    const filteredUsers = search 
      ? users.filter(u => 
          u.name.toLowerCase().includes((search as string).toLowerCase()) ||
          u.bio?.toLowerCase().includes((search as string).toLowerCase()) ||
          u.skills?.toLowerCase().includes((search as string).toLowerCase())
        )
      : users;
    
    res.json({
      users: filteredUsers,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user by ID
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        role: true,
        bio: true,
        hourlyRate: true,
        skills: true,
        location: true,
        timezone: true,
        isVerified: true,
        profile: {
          select: {
            title: true,
            description: true,
            portfolioUrls: true,
            languages: true,
            responseTime: true,
            completedJobs: true,
            rating: true,
            reviewCount: true,
            createdAt: true
          }
        },
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

// Update profile (humans only)
router.put('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'human') {
      return res.status(403).json({ error: 'Humans only' });
    }
    
    const { 
      name,
      avatarUrl,
      bio,
      hourlyRate,
      skills,
      availability,
      location,
      timezone,
      title,
      description,
      portfolioUrls,
      languages,
      responseTime
    } = req.body;
    
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        name,
        avatarUrl,
        bio,
        hourlyRate,
        skills: skills ? JSON.stringify(skills) : undefined,
        availability: availability ? JSON.stringify(availability) : undefined,
        location,
        timezone,
        profile: {
          upsert: {
            create: {
              title,
              description,
              portfolioUrls: portfolioUrls ? JSON.stringify(portfolioUrls) : undefined,
              languages: languages ? JSON.stringify(languages) : undefined,
              responseTime
            },
            update: {
              title,
              description,
              portfolioUrls: portfolioUrls ? JSON.stringify(portfolioUrls) : undefined,
              languages: languages ? JSON.stringify(languages) : undefined,
              responseTime
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        bio: true,
        hourlyRate: true,
        skills: true,
        location: true,
        timezone: true,
        profile: true
      }
    });
    
    res.json({ message: 'Profile updated', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user's public reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { subjectId: req.params.id },
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      }
    });
    
    // Calculate rating distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
      distribution[r.rating as keyof typeof distribution]++;
    });
    
    res.json({
      reviews,
      distribution,
      average: reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

export default router;
