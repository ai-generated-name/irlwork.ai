import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get reviews for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { subjectId: req.params.userId },
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
        },
        job: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });
    
    const stats = await prisma.review.aggregate({
      where: { subjectId: req.params.userId },
      _avg: { rating: true },
      _count: { rating: true }
    });
    
    // Calculate rating distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
      distribution[r.rating as keyof typeof distribution]++;
    });
    
    res.json({
      reviews,
      stats: {
        average: stats._avg.rating || 0,
        count: stats._count.rating
      },
      distribution
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

// Create review
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { subjectId, jobId, rating, comment } = req.body;
    
    if (!subjectId || !jobId || !rating) {
      return res.status(400).json({ error: 'Subject ID, job ID, and rating are required' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    // Verify job exists and is completed
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (job.status !== 'completed') {
      return res.status(400).json({ error: 'Can only review completed jobs' });
    }
    
    // Only creator or worker can review
    const isParticipant = [job.creatorId, job.workerId].includes(req.user!.id);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Can't review yourself
    if (subjectId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot review yourself' });
    }
    
    // Verify the subject was part of the job
    const validSubject = [job.creatorId, job.workerId].includes(subjectId);
    if (!validSubject) {
      return res.status(400).json({ error: 'Subject must be a job participant' });
    }
    
    // Check if already reviewed
    const existing = await prisma.review.findFirst({
      where: {
        jobId,
        authorId: req.user!.id,
        subjectId
      }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Already reviewed this user for this job' });
    }
    
    const review = await prisma.review.create({
      data: {
        rating,
        comment,
        jobId,
        authorId: req.user!.id,
        subjectId
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    // Update subject's rating stats
    const newStats = await prisma.review.aggregate({
      where: { subjectId },
      _avg: { rating: true },
      _count: { rating: true }
    });
    
    await prisma.profile.updateMany({
      where: { userId: subjectId },
      data: {
        rating: newStats._avg.rating || 0,
        reviewCount: newStats._count.rating
      }
    });
    
    res.status(201).json({ message: 'Review created', review });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Update review
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const review = await prisma.review.findUnique({
      where: { id: req.params.id }
    });
    
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    
    if (review.authorId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const { rating, comment } = req.body;
    
    const updatedReview = await prisma.review.update({
      where: { id: req.params.id },
      data: { rating, comment }
    });
    
    // Recalculate stats
    const newStats = await prisma.review.aggregate({
      where: { subjectId: review.subjectId },
      _avg: { rating: true },
      _count: { rating: true }
    });
    
    await prisma.profile.updateMany({
      where: { userId: review.subjectId },
      data: {
        rating: newStats._avg.rating || 0,
        reviewCount: newStats._count.rating
      }
    });
    
    res.json({ message: 'Review updated', review: updatedReview });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

export default router;
