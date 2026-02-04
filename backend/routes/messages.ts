import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get messages (conversation or all)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { jobId, otherUserId } = req.query;
    
    if (jobId) {
      // Get messages for a specific job
      const messages = await prisma.message.findMany({
        where: {
          jobId: jobId as string,
          OR: [
            { senderId: req.user!.id },
            { receiverId: req.user!.id }
          ]
        },
        select: {
          id: true,
          content: true,
          read: true,
          createdAt: true,
          sender: {
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
        },
        orderBy: { createdAt: 'asc' }
      });
      
      res.json({ messages });
    } else if (otherUserId) {
      // Get conversation with specific user
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: req.user!.id, receiverId: otherUserId as string },
            { senderId: otherUserId as string, receiverId: req.user!.id }
          ]
        },
        select: {
          id: true,
          content: true,
          read: true,
          createdAt: true,
          sender: {
            select: {
              id: true,
              name: true,
              avatarUrl: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });
      
      res.json({ messages });
    } else {
      // Get all conversations (grouped)
      const conversations = await prisma.message.groupBy({
        by: ['senderId', 'receiverId'],
        where: {
          OR: [
            { senderId: req.user!.id },
            { receiverId: req.user!.id }
          ]
        },
        _max: {
          createdAt: true
        },
        orderBy: {
          _max: {
            createdAt: 'desc'
          }
        }
      });
      
      // Get last message for each conversation
      const result = await Promise.all(
        conversations.map(async (conv) => {
          const otherId = conv.senderId === req.user!.id ? conv.receiverId : conv.senderId;
          const lastMessage = await prisma.message.findFirst({
            where: {
              OR: [
                { senderId: req.user!.id, receiverId: otherId },
                { senderId: otherId, receiverId: req.user!.id }
              ]
            },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              content: true,
              createdAt: true,
              read: true,
              sender: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true
                }
              }
            }
          });
          
          const unreadCount = await prisma.message.count({
            where: {
              senderId: otherId,
              receiverId: req.user!.id,
              read: false
            }
          });
          
          return {
            userId: otherId,
            user: lastMessage?.sender,
            lastMessage: lastMessage ? {
              id: lastMessage.id,
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
              fromMe: lastMessage.sender.id === req.user!.id
            } : null,
            unreadCount
          };
        })
      );
      
      res.json({ conversations: result });
    }
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Send message
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { receiverId, content, jobId } = req.body;
    
    if (!receiverId || !content) {
      return res.status(400).json({ error: 'Receiver ID and content are required' });
    }
    
    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    });
    
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }
    
    // If jobId provided, verify access
    if (jobId) {
      const job = await prisma.job.findUnique({
        where: { id: jobId }
      });
      
      if (!job || ![job.creatorId, job.workerId].includes(req.user!.id)) {
        return res.status(403).json({ error: 'Not authorized for this job' });
      }
    }
    
    const message = await prisma.message.create({
      data: {
        content,
        senderId: req.user!.id,
        receiverId,
        jobId
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      }
    });
    
    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read
router.patch('/read', authenticate, async (req: AuthRequest, res) => {
  try {
    const { senderId, jobId } = req.body;
    
    const where: any = {
      receiverId: req.user!.id,
      read: false
    };
    
    if (senderId) {
      where.senderId = senderId;
    }
    if (jobId) {
      where.jobId = jobId;
    }
    
    await prisma.message.updateMany({
      where,
      data: { read: true }
    });
    
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Get unread count
router.get('/unread/count', authenticate, async (req: AuthRequest, res) => {
  try {
    const count = await prisma.message.count({
      where: {
        receiverId: req.user!.id,
        read: false
      }
    });
    
    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

export default router;
