import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all jobs
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const {
      category,
      taskType,
      status = 'open',
      minBudget,
      maxBudget,
      priority,
      vehicleType,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const where: any = {};

    if (status !== 'all') {
      where.status = status || 'open';
    }

    if (category) {
      where.category = category;
    }

    if (taskType) {
      where.taskType = taskType;
    }

    if (priority) {
      where.priority = priority;
    }

    if (vehicleType) {
      where.vehicleType = vehicleType;
    }
    
    if (minBudget || maxBudget) {
      where.budget = {};
      if (minBudget) where.budget.gte = parseFloat(minBudget as string);
      if (maxBudget) where.budget.lte = parseFloat(maxBudget as string);
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { description: { contains: search as string } }
      ];
    }
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          subcategory: true,
          status: true,
          budget: true,
          budgetType: true,
          taskType: true,
          priority: true,
          pickupAddress: true,
          deliveryAddress: true,
          itemDescription: true,
          vehicleType: true,
          requiredSkills: true,
          deadline: true,
          createdAt: true,
          creator: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              isVerified: true
            }
          },
          worker: {
            select: {
              id: true,
              name: true,
              avatarUrl: true
            }
          },
          _count: {
            select: {
              bookings: true,
              messages: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.job.count({ where })
    ]);
    
    res.json({
      jobs,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
});

// Get job by ID
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        subcategory: true,
        status: true,
        budget: true,
        budgetType: true,
        taskType: true,
        priority: true,
        pickupAddress: true,
        deliveryAddress: true,
        itemDescription: true,
        itemWeight: true,
        itemDimensions: true,
        assemblyItems: true,
        errandDetails: true,
        vehicleType: true,
        estimatedHours: true,
        requiredSkills: true,
        deadline: true,
        attachments: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            isVerified: true,
            profile: {
              select: {
                rating: true,
                reviewCount: true
              }
            }
          }
        },
        worker: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profile: {
              select: {
                rating: true,
                reviewCount: true
              }
            }
          }
        },
        bookings: {
          select: {
            id: true,
            status: true,
            scheduledAt: true
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      }
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({ job });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Failed to get job' });
  }
});

// Create job (agents only)
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'agent') {
      return res.status(403).json({ error: 'Agents only' });
    }
    
    const {
      title,
      description,
      category,
      subcategory,
      budget,
      budgetType = 'fixed',
      taskType = 'standard',
      priority = 'normal',
      pickupAddress,
      deliveryAddress,
      itemDescription,
      itemWeight,
      itemDimensions,
      assemblyItems,
      errandDetails,
      vehicleType,
      estimatedHours,
      requiredSkills,
      deadline,
      attachments
    } = req.body;

    if (!title || !description || !category || !budget) {
      return res.status(400).json({ error: 'Title, description, category, and budget are required' });
    }

    const job = await prisma.job.create({
      data: {
        title,
        description,
        category,
        subcategory,
        budget: parseFloat(budget),
        budgetType,
        taskType,
        priority,
        pickupAddress,
        deliveryAddress,
        itemDescription,
        itemWeight: itemWeight ? parseFloat(itemWeight) : undefined,
        itemDimensions: itemDimensions ? JSON.stringify(itemDimensions) : undefined,
        assemblyItems: assemblyItems ? JSON.stringify(assemblyItems) : undefined,
        errandDetails: errandDetails ? JSON.stringify(errandDetails) : undefined,
        vehicleType,
        estimatedHours,
        requiredSkills: requiredSkills ? JSON.stringify(requiredSkills) : undefined,
        deadline: deadline ? new Date(deadline) : undefined,
        attachments: attachments ? JSON.stringify(attachments) : undefined,
        creatorId: req.user!.id
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        status: true,
        budget: true,
        createdAt: true,
        creator: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    res.status(201).json({ message: 'Job created', job });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Update job
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id }
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (job.creatorId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    if (job.status !== 'open') {
      return res.status(400).json({ error: 'Can only edit open jobs' });
    }
    
    const {
      title,
      description,
      category,
      subcategory,
      budget,
      budgetType,
      taskType,
      priority,
      pickupAddress,
      deliveryAddress,
      itemDescription,
      itemWeight,
      itemDimensions,
      assemblyItems,
      errandDetails,
      vehicleType,
      estimatedHours,
      requiredSkills,
      deadline,
      attachments
    } = req.body;

    const updatedJob = await prisma.job.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        category,
        subcategory,
        budget: budget ? parseFloat(budget) : undefined,
        budgetType,
        taskType,
        priority,
        pickupAddress,
        deliveryAddress,
        itemDescription,
        itemWeight: itemWeight ? parseFloat(itemWeight) : undefined,
        itemDimensions: itemDimensions ? JSON.stringify(itemDimensions) : undefined,
        assemblyItems: assemblyItems ? JSON.stringify(assemblyItems) : undefined,
        errandDetails: errandDetails ? JSON.stringify(errandDetails) : undefined,
        vehicleType,
        estimatedHours,
        requiredSkills: requiredSkills ? JSON.stringify(requiredSkills) : undefined,
        deadline: deadline ? new Date(deadline) : undefined,
        attachments: attachments ? JSON.stringify(attachments) : undefined
      },
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true
      }
    });
    
    res.json({ message: 'Job updated', job: updatedJob });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Accept job (humans only)
router.post('/:id/accept', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'human') {
      return res.status(403).json({ error: 'Humans only' });
    }
    
    const job = await prisma.job.findUnique({
      where: { id: req.params.id }
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (job.status !== 'open') {
      return res.status(400).json({ error: 'Job is not open' });
    }
    
    if (job.creatorId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot accept your own job' });
    }
    
    const updatedJob = await prisma.job.update({
      where: { id: req.params.id },
      data: {
        status: 'in_progress',
        workerId: req.user!.id
      },
      select: {
        id: true,
        title: true,
        status: true,
        worker: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    res.json({ message: 'Job accepted', job: updatedJob });
  } catch (error) {
    console.error('Accept job error:', error);
    res.status(500).json({ error: 'Failed to accept job' });
  }
});

// Complete job
router.post('/:id/complete', authenticate, async (req: AuthRequest, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id }
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (![job.creatorId, job.workerId].includes(req.user!.id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const updatedJob = await prisma.job.update({
      where: { id: req.params.id },
      data: { status: 'completed' },
      select: {
        id: true,
        title: true,
        status: true,
        worker: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    // Update worker's completed jobs count
    if (job.workerId) {
      await prisma.profile.updateMany({
        where: { userId: job.workerId },
        data: { completedJobs: { increment: 1 } }
      });
    }
    
    res.json({ message: 'Job completed', job: updatedJob });
  } catch (error) {
    console.error('Complete job error:', error);
    res.status(500).json({ error: 'Failed to complete job' });
  }
});

// Cancel job
router.post('/:id/cancel', authenticate, async (req: AuthRequest, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id }
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (job.creatorId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    if (job.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel completed job' });
    }
    
    const updatedJob = await prisma.job.update({
      where: { id: req.params.id },
      data: { status: 'cancelled' },
      select: {
        id: true,
        title: true,
        status: true
      }
    });
    
    res.json({ message: 'Job cancelled', job: updatedJob });
  } catch (error) {
    console.error('Cancel job error:', error);
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

// Get my jobs (created or accepted)
router.get('/my/jobs', authenticate, async (req: AuthRequest, res) => {
  try {
    const { type = 'all' } = req.query;
    
    const where: any = {};
    
    if (type === 'created') {
      where.creatorId = req.user!.id;
    } else if (type === 'accepted') {
      where.workerId = req.user!.id;
    } else {
      where.OR = [
        { creatorId: req.user!.id },
        { workerId: req.user!.id }
      ];
    }
    
    const jobs = await prisma.job.findMany({
      where,
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        budget: true,
        budgetType: true,
        createdAt: true,
        worker: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ jobs });
  } catch (error) {
    console.error('Get my jobs error:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
});

// Get ad hoc task types
router.get('/types/adhoc', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const adHocTypes = [
      {
        type: 'delivery',
        label: 'Delivery',
        icon: '🚗',
        description: 'Deliver packages, food, or items from one location to another',
        fields: ['pickupAddress', 'deliveryAddress', 'itemDescription', 'itemWeight', 'vehicleType']
      },
      {
        type: 'pickup',
        label: 'Pickup',
        icon: '📦',
        description: 'Pick up items from a location and bring them to you',
        fields: ['pickupAddress', 'deliveryAddress', 'itemDescription', 'itemWeight']
      },
      {
        type: 'errand',
        label: 'Errand',
        icon: '🏃',
        description: 'Run personal errands like grocery shopping, returns, or appointments',
        fields: ['errandDetails', 'priority']
      },
      {
        type: 'assembly',
        label: 'Assembly',
        icon: '🔧',
        description: 'Assemble furniture, equipment, or other items',
        fields: ['assemblyItems', 'itemDescription', 'requiredSkills']
      }
    ];

    res.json({ types: adHocTypes });
  } catch (error) {
    console.error('Get ad hoc types error:', error);
    res.status(500).json({ error: 'Failed to get ad hoc types' });
  }
});

export default router;
