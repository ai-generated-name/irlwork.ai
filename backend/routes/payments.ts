import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get payments for current user
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { status, type } = req.query;
    
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (type === 'sent') {
      where.payerId = req.user!.id;
    } else if (type === 'received') {
      where.payeeId = req.user!.id;
    } else {
      where.OR = [
        { payerId: req.user!.id },
        { payeeId: req.user!.id }
      ];
    }
    
    const payments = await prisma.payment.findMany({
      where,
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        type: true,
        createdAt: true,
        releasedAt: true,
        job: {
          select: {
            id: true,
            title: true
          }
        },
        payer: {
          select: {
            id: true,
            name: true
          }
        },
        payee: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ payments });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to get payments' });
  }
});

// Create escrow payment (deposit)
router.post('/escrow', authenticate, async (req: AuthRequest, res) => {
  try {
    const { jobId, amount } = req.body;
    
    if (!jobId || !amount) {
      return res.status(400).json({ error: 'Job ID and amount are required' });
    }
    
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        status: true,
        creatorId: true,
        workerId: true,
        budget: true
      }
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (job.creatorId !== req.user!.id) {
      return res.status(403).json({ error: 'Only the job creator can deposit escrow' });
    }
    
    if (parseFloat(amount) > job.budget) {
      return res.status(400).json({ error: 'Amount exceeds job budget' });
    }
    
    // Create escrow payment
    const payment = await prisma.payment.create({
      data: {
        amount: parseFloat(amount),
        currency: 'USD',
        status: 'held',
        type: 'escrow',
        jobId,
        payerId: req.user!.id,
        payeeId: job.workerId!,
        escrowId: `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      },
      select: {
        id: true,
        amount: true,
        status: true,
        escrowId: true,
        createdAt: true
      }
    });
    
    // Update payer wallet
    await prisma.wallet.update({
      where: { userId: req.user!.id },
      data: {
        balance: { decrement: parseFloat(amount) },
        transactions: {
          create: {
            amount: -parseFloat(amount),
            type: 'payment',
            description: `Escrow for: ${job.title}`
          }
        }
      }
    });
    
    res.status(201).json({
      message: 'Escrow payment created',
      payment,
      // In production, this would include Stripe checkout URL
      nextStep: 'Payment held in escrow. Release funds when job is complete.'
    });
  } catch (error) {
    console.error('Create escrow error:', error);
    res.status(500).json({ error: 'Failed to create escrow payment' });
  }
});

// Release escrow to worker
router.post('/:id/release', authenticate, async (req: AuthRequest, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id }
    });
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    if (payment.payerId !== req.user!.id) {
      return res.status(403).json({ error: 'Only payer can release escrow' });
    }
    
    if (payment.status !== 'held') {
      return res.status(400).json({ error: 'Payment is not held in escrow' });
    }
    
    // Release the payment
    const updatedPayment = await prisma.payment.update({
      where: { id: req.params.id },
      data: {
        status: 'released',
        releasedAt: new Date()
      },
      select: {
        id: true,
        amount: true,
        status: true,
        releasedAt: true
      }
    });
    
    // Update payee wallet
    await prisma.wallet.update({
      where: { userId: payment.payeeId },
      data: {
        balance: { increment: payment.amount },
        transactions: {
          create: {
            amount: payment.amount,
            type: 'payout',
            description: 'Payment released from escrow'
          }
        }
      }
    });
    
    res.json({
      message: 'Payment released to worker',
      payment: updatedPayment
    });
  } catch (error) {
    console.error('Release escrow error:', error);
    res.status(500).json({ error: 'Failed to release escrow' });
  }
});

// Request refund
router.post('/:id/refund', authenticate, async (req: AuthRequest, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id }
    });
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    if (payment.payerId !== req.user!.id) {
      return res.status(403).json({ error: 'Only payer can request refund' });
    }
    
    if (payment.status !== 'held') {
      return res.status(400).json({ error: 'Only held payments can be refunded' });
    }
    
    // Process refund
    await prisma.payment.update({
      where: { id: req.params.id },
      data: { status: 'refunded' }
    });
    
    // Refund to payer wallet
    await prisma.wallet.update({
      where: { userId: payment.payerId },
      data: {
        balance: { increment: payment.amount },
        transactions: {
          create: {
            amount: payment.amount,
            type: 'refund',
            description: 'Escrow refund'
          }
        }
      }
    });
    
    res.json({ message: 'Payment refunded' });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

export default router;
