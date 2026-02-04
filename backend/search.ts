import { Router } from 'express';
import { prisma } from '../index.js';
import { optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Search users and jobs
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { q, type = 'all', category } = req.query;
    
    if (!q || (q as string).trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }
    
    const searchTerm = (q as string).toLowerCase();
    const results: any = {};
    
    // Search users (humans/workers)
    if (type === 'all' || type === 'users') {
      const users = await prisma.user.findMany({
        where: {
          role: 'human',
          OR: [
            { name: { contains: searchTerm } },
            { bio: { contains: searchTerm } },
            { skills: { contains: searchTerm } },
            { location: { contains: searchTerm } }
          ]
        },
        take: 10,
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          bio: true,
          hourlyRate: true,
          skills: true,
          location: true,
          profile: {
            select: {
              title: true,
              rating: true,
              reviewCount: true
            }
          }
        }
      });
      results.users = users;
    }
    
    // Search jobs
    if (type === 'all' || type === 'jobs') {
      const jobWhere: any = {
        status: 'open',
        OR: [
          { title: { contains: searchTerm } },
          { description: { contains: searchTerm } },
          { category: { contains: searchTerm } }
        ]
      };
      
      if (category) {
        jobWhere.category = category;
      }
      
      const jobs = await prisma.job.findMany({
        where: jobWhere,
        take: 10,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          budget: true,
          budgetType: true,
          createdAt: true,
          creator: {
            select: {
              id: true,
              name: true,
              avatarUrl: true
            }
          }
        }
      });
      results.jobs = jobs;
    }
    
    res.json({ results, query: q });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get categories with counts
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.job.groupBy({
      by: ['category'],
      where: { status: 'open' },
      _count: { category: true },
      orderBy: {
        _count: {
          category: 'desc'
        }
      }
    });
    
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Suggest search terms
router.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || (q as string).length < 2) {
      return res.json({ suggestions: [] });
    }
    
    const searchTerm = (q as string).toLowerCase();
    
    // Get popular job titles
    const jobTitles = await prisma.job.findMany({
      where: {
        OR: [
          { title: { contains: searchTerm } }
        ],
        status: 'open'
      },
      select: { title: true },
      take: 5,
      distinct: ['title']
    });
    
    // Get popular skills
    const users = await prisma.user.findMany({
      where: {
        role: 'human',
        skills: { contains: searchTerm }
      },
      select: { skills: true },
      take: 10
    });
    
    const skillSet = new Set<string>();
    users.forEach(u => {
      if (u.skills) {
        const skills = JSON.parse(u.skills) as string[];
        skills.forEach(s => {
          if (s.toLowerCase().includes(searchTerm)) {
            skillSet.add(s);
          }
        });
      }
    });
    
    res.json({
      suggestions: [
        ...jobTitles.map(j => ({ type: 'job', value: j.title })),
        ...Array.from(skillSet).slice(0, 5).map(s => ({ type: 'skill', value: s }))
      ]
    });
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

export default router;
