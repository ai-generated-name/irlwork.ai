import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get bookings for current user
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { status, type } = req.query;
    
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (type === 'client') {
      where.clientId = req.user!.id;
    } else if (type === 'worker') {
      where.workerId = req.user!.id;
    } else {
      where.OR = [
        { clientId: req.user!.id },
        { workerId: req.user!.id }
      ];
    }
    
    const bookings = await prisma.booking.findMany({
      where,
      select: {
        id: true,
        scheduledAt: true,
        duration: true,
        status: true,
        notes: true,
        createdAt: true,
        job: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            budget: true
          }
        },
        client: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        },
        worker: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { scheduledAt: 'asc' }
    });
    
    res.json({ bookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

// Create booking
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { jobId, scheduledAt, duration, notes } = req.body;
    
    if (!jobId || !scheduledAt || !duration) {
      return res.status(400).json({ error: 'Job ID, scheduled time, and duration are required' });
    }
    
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        status: true,
        creatorId: true,
        workerId: true
      }
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (job.status !== 'in_progress') {
      return res.status(400).json({ error: 'Job must be in progress to book' });
    }
    
    // Determine client and worker
    const isClient = job.creatorId === req.user!.id;
    const isWorker = job.workerId === req.user!.id;
    
    if (!isClient && !isWorker) {
      return res.status(403).json({ error: 'Not authorized for this job' });
    }
    
    const clientId = isClient ? req.user!.id : job.creatorId;
    const workerId = isWorker ? req.user!.id : job.workerId!;
    
    const booking = await prisma.booking.create({
      data: {
        jobId,
        clientId,
        workerId,
        scheduledAt: new Date(scheduledAt),
        duration: parseInt(duration),
        notes,
        status: 'pending'
      },
      select: {
        id: true,
        scheduledAt: true,
        duration: true,
        status: true,
        notes: true,
        job: {
          select: {
            id: true,
            title: true
          }
        },
        client: {
          select: {
            id: true,
            name: true
          }
        },
        worker: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    res.status(201).json({ message: 'Booking created', booking });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Update booking status
router.patch('/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id }
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Both client and worker can update status
    const isAuthorized = [booking.clientId, booking.workerId].includes(req.user!.id);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const validStatuses = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const updatedBooking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status },
      select: {
        id: true,
        status: true,
        scheduledAt: true
      }
    });
    
    res.json({ message: 'Booking updated', booking: updatedBooking });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// Cancel booking
router.post('/:id/cancel', authenticate, async (req: AuthRequest, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const isAuthorized = [booking.clientId, booking.workerId].includes(req.user!.id);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status: 'cancelled' },
      select: {
        id: true,
        status: true
      }
    });

    res.json({ message: 'Booking cancelled', booking: updatedBooking });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// Upload video verification for booking
router.post('/:id/video-verify', authenticate, async (req: AuthRequest, res) => {
  try {
    const { videoUrl, thumbnailUrl, duration } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Only the worker can upload video verification
    if (booking.workerId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the assigned worker can upload video verification' });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: req.params.id },
      data: {
        videoUrl,
        videoThumbnailUrl: thumbnailUrl || null,
        videoDuration: duration ? parseInt(duration) : null,
        videoUploadedAt: new Date()
      },
      select: {
        id: true,
        videoUrl: true,
        videoThumbnailUrl: true,
        videoDuration: true,
        videoUploadedAt: true,
        status: true,
        job: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    res.json({ message: 'Video verification uploaded', booking: updatedBooking });
  } catch (error) {
    console.error('Video verification upload error:', error);
    res.status(500).json({ error: 'Failed to upload video verification' });
  }
});

// Verify video (client only)
router.post('/:id/video-verify/confirm', authenticate, async (req: AuthRequest, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Only the client can verify the video
    if (booking.clientId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the client can verify video' });
    }

    if (!booking.videoUrl) {
      return res.status(400).json({ error: 'No video to verify' });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: req.params.id },
      data: {
        videoVerified: true,
        videoVerifiedAt: new Date(),
        videoVerifiedBy: req.user!.id
      },
      select: {
        id: true,
        videoVerified: true,
        videoVerifiedAt: true,
        status: true,
        job: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    res.json({ message: 'Video verified successfully', booking: updatedBooking });
  } catch (error) {
    console.error('Video verification error:', error);
    res.status(500).json({ error: 'Failed to verify video' });
  }
});

// Reject video verification
router.post('/:id/video-verify/reject', authenticate, async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Only the client can reject the video
    if (booking.clientId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the client can reject video' });
    }

    // Clear video verification fields
    const updatedBooking = await prisma.booking.update({
      where: { id: req.params.id },
      data: {
        videoUrl: null,
        videoThumbnailUrl: null,
        videoDuration: null,
        videoUploadedAt: null,
        videoVerified: false,
        videoVerifiedAt: null,
        videoVerifiedBy: null
      },
      select: {
        id: true,
        status: true,
        job: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    res.json({ message: 'Video rejected', booking: updatedBooking, reason: reason || 'Video did not meet requirements' });
  } catch (error) {
    console.error('Video rejection error:', error);
    res.status(500).json({ error: 'Failed to reject video' });
  }
});

// Get booking with video verification status
router.get('/:id/video-status', authenticate, async (req: AuthRequest, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        status: true,
        videoUrl: true,
        videoThumbnailUrl: true,
        videoDuration: true,
        videoUploadedAt: true,
        videoVerified: true,
        videoVerifiedAt: true,
        videoVerifiedBy: true,
        worker: {
          select: {
            id: true,
            name: true
          }
        },
        client: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Get video status error:', error);
    res.status(500).json({ error: 'Failed to get video status' });
  }
});

export default router;
