import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get wallet balance and transactions
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user!.id },
      select: {
        id: true,
        balance: true,
        currency: true,
        transactions: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            type: true,
            description: true,
            createdAt: true
          }
        }
      }
    });
    
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    res.json({ wallet });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ error: 'Failed to get wallet' });
  }
});

// Add funds to wallet (deposit)
router.post('/deposit', authenticate, async (req: AuthRequest, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    // In production, this would integrate with Stripe
    // For now, we simulate instant deposits
    const wallet = await prisma.wallet.update({
      where: { userId: req.user!.id },
      data: {
        balance: { increment: parseFloat(amount) },
        transactions: {
          create: {
            amount: parseFloat(amount),
            type: 'deposit',
            description: 'Wallet deposit'
          }
        }
      },
      select: {
        id: true,
        balance: true,
        currency: true
      }
    });
    
    res.json({
      message: 'Deposit successful',
      wallet
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ error: 'Failed to process deposit' });
  }
});

// Withdraw from wallet
router.post('/withdraw', authenticate, async (req: AuthRequest, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user!.id }
    });
    
    if (!wallet || wallet.balance < parseFloat(amount)) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // In production, this would integrate with Stripe payouts
    const updatedWallet = await prisma.wallet.update({
      where: { userId: req.user!.id },
      data: {
        balance: { decrement: parseFloat(amount) },
        transactions: {
          create: {
            amount: -parseFloat(amount),
            type: 'withdrawal',
            description: 'Withdrawal to bank'
          }
        }
      },
      select: {
        id: true,
        balance: true,
        currency: true
      }
    });
    
    res.json({
      message: 'Withdrawal initiated',
      wallet: updatedWallet
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
});

// Get wallet transactions
router.get('/transactions', authenticate, async (req: AuthRequest, res) => {
  try {
    const { type, limit = 50, offset = 0 } = req.query;
    
    const where: any = {};
    if (type) {
      where.type = type;
    }
    
    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: {
          wallet: { userId: req.user!.id },
          ...where
        },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.walletTransaction.count({
        where: {
          wallet: { userId: req.user!.id },
          ...where
        }
      })
    ]);
    
    res.json({
      transactions,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

export default router;
