// Database seed script - run with: npx tsx prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generateApiKey() {
  return 'irl_' + crypto.randomBytes(24).toString('hex');
}

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo agent
  const agent = await prisma.user.upsert({
    where: { email: 'agent@demo.com' },
    update: {},
    create: {
      id: 'agent-demo-001',
      email: 'agent@demo.com',
      passwordHash: crypto.createHash('sha256').update('demo123').digest('hex'),
      name: 'Demo AI Agent',
      role: 'agent',
      isVerified: true,
      apiKey: generateApiKey(),
      agentConfig: JSON.stringify({ mcpEnabled: true, autoHire: false })
    }
  });
  console.log('✅ Created demo agent:', agent.email);

  // Create wallet for agent
  await prisma.wallet.upsert({
    where: { userId: agent.id },
    update: {},
    create: {
      userId: agent.id,
      balance: 500,
      currency: 'USDC'
    }
  });

  // Create demo humans
  const humans = [
    {
      id: 'human-demo-001',
      email: 'sarah@demo.com',
      name: 'Sarah M.',
      bio: 'Reliable delivery driver with 3 years experience. I have a reliable car and always on time!',
      hourlyRate: 35,
      skills: ['delivery', 'pickup', 'errands'],
      isVerified: true
    },
    {
      id: 'human-demo-002',
      email: 'mike@demo.com',
      name: 'Mike T.',
      bio: 'Physical task specialist. Moving, assembly, heavy lifting - I handle it all.',
      hourlyRate: 45,
      skills: ['moving', 'assembly', 'cleaning'],
      isVerified: true
    },
    {
      id: 'human-demo-003',
      email: 'lisa@demo.com',
      name: 'Lisa K.',
      bio: 'Pet care expert! Certified veterinary assistant. Your pets are in good hands.',
      hourlyRate: 30,
      skills: ['dog_walking', 'pet_sitting', 'pet_boarding'],
      isVerified: true
    },
    {
      id: 'human-demo-004',
      email: 'james@demo.com',
      name: 'James W.',
      bio: 'Tech setup specialist. I can help with any device setup, troubleshooting, or installation.',
      hourlyRate: 55,
      skills: ['tech_setup', 'photography', 'assembly'],
      isVerified: true
    },
    {
      id: 'human-demo-005',
      email: 'emma@demo.com',
      name: 'Emma L.',
      bio: 'Event staff and promotional work. Professional, punctual, and great with crowds.',
      hourlyRate: 28,
      skills: ['event_staff', 'stand_billboard', 'wait_line'],
      isVerified: true
    }
  ];

  for (const human of humans) {
    await prisma.user.upsert({
      where: { email: human.email },
      update: {},
      create: {
        ...human,
        skills: JSON.stringify(human.skills),
        passwordHash: crypto.createHash('sha256').update('demo123').digest('hex'),
        role: 'human',
        isVerified: human.isVerified
      }
    });

    // Create wallet for each human
    await prisma.wallet.upsert({
      where: { userId: human.id },
      update: {},
      create: {
        userId: human.id,
        balance: Math.floor(Math.random() * 100) + 50,
        currency: 'USDC'
      }
    });
  }
  console.log(`✅ Created ${humans.length} demo humans`);

  // Create profile for agent
  await prisma.profile.upsert({
    where: { userId: agent.id },
    update: {},
    create: {
      userId: agent.id,
      title: 'AI Task Orchestrator',
      description: 'Automated agent that coordinates human workers for real-world tasks.',
      completedJobs: 47,
      rating: 4.9,
      reviewCount: 42
    }
  });

  // Create demo jobs
  const jobs = [
    {
      title: 'Pickup and deliver Amazon package',
      description: 'Pick up a medium-sized package from Amazon Locker in Downtown and deliver to a residential address in the suburbs.',
      category: 'delivery',
      budget: 45,
      priority: 'normal',
      creatorId: agent.id,
      status: 'open'
    },
    {
      title: 'Stand with startup banner at tech conference',
      description: 'Stand with our banner at the tech conference entrance for 4 hours.',
      category: 'event_staff',
      budget: 80,
      priority: 'high',
      creatorId: agent.id,
      status: 'open'
    },
    {
      title: 'Walk Golden Retriever twice daily',
      description: 'Morning and evening walks for a friendly Golden Retriever.',
      category: 'dog_walking',
      budget: 50,
      budgetType: 'hourly',
      priority: 'normal',
      creatorId: agent.id,
      status: 'open'
    },
    {
      title: 'Wait in line for product launch',
      description: 'Wait in line at the store for a limited edition product release.',
      category: 'wait_line',
      budget: 100,
      priority: 'urgent',
      creatorId: agent.id,
      status: 'open'
    },
    {
      title: 'Assemble IKEA wardrobe',
      description: 'Assemble a wardrobe closet from IKEA. All tools provided.',
      category: 'assembly',
      budget: 75,
      priority: 'normal',
      creatorId: agent.id,
      status: 'open'
    },
    {
      title: 'Grocery run for elderly neighbor',
      description: 'Pick up groceries from the list and deliver to an elderly person.',
      category: 'grocery',
      budget: 35,
      priority: 'normal',
      creatorId: agent.id,
      status: 'open'
    },
    {
      title: 'Office cleaning after event',
      description: 'Light office cleaning after a corporate event.',
      category: 'cleaning',
      budget: 100,
      priority: 'normal',
      creatorId: agent.id,
      status: 'open'
    },
    {
      title: 'Real estate photography',
      description: 'Take professional photos of a 2-bedroom apartment.',
      category: 'photography',
      budget: 150,
      priority: 'normal',
      creatorId: agent.id,
      status: 'open'
    }
  ];

  for (const job of jobs) {
    await prisma.job.create({ data: job });
  }
  console.log(`✅ Created ${jobs.length} demo jobs`);

  // Create API key for agent
  await prisma.apiKey.upsert({
    where: { id: 'demo-key-001' },
    update: {},
    create: {
      id: 'demo-key-001',
      key: agent.apiKey!,
      name: 'Demo Production Key',
      userId: agent.id
    }
  });

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('Demo Accounts:');
  console.log('─────────────');
  console.log('Agent: agent@demo.com / demo123');
  console.log('API Key:', agent.apiKey);
  console.log('');
  console.log('Humans: sarah@demo.com, mike@demo.com, lisa@demo.com, etc.');
  console.log('Password: demo123 for all');
  console.log('');
  console.log('API Usage:');
  console.log('─────────');
  console.log('POST /api/mcp');
  console.log('Authorization: Bearer ' + agent.apiKey);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
