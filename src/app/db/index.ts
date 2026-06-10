import config from '../config';
import prisma from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { Role, SubscriptionTier } from '@prisma/client';

export const seedAdmin = async () => {
  try {
    // 1. Seed the 4 Subscription Tiers safely using upsert
    const tiers = [
      {
        tier: SubscriptionTier.BRONZE,
        photographerSplit: 70,
        platformSplit: 30,
        maxPrice: 20,
        dailyUploadLimit: 10,
        requiresApproval: true,
      },
      {
        tier: SubscriptionTier.SILVER,
        photographerSplit: 80,
        platformSplit: 20,
        maxPrice: null,
        dailyUploadLimit: null,
        requiresApproval: false,
      },
      {
        tier: SubscriptionTier.GOLD,
        photographerSplit: 90,
        platformSplit: 10,
        maxPrice: null,
        dailyUploadLimit: null,
        requiresApproval: false,
      },
      {
        tier: SubscriptionTier.GOLD_PLUS,
        photographerSplit: 1,
        platformSplit: 99,
        maxPrice: null,
        dailyUploadLimit: null,
        requiresApproval: false,
      },
    ];

    for (const tierData of tiers) {
      await prisma.subscriptionConfig.upsert({
        where: { tier: tierData.tier },
        update: {}, // Don't override if it already exists (admin might have changed it)
        create: tierData,
      });
    }
    console.log('Subscription configs synced successfully.');

    // 2. Seed Admin
    const adminEmail = process.env.ADMIN_EMAIL || '';
    const adminPassword = process.env.ADMIN_PASSWORD || '';
    
    const existingAdmin = await prisma.user.findFirst({
      where: { role: Role.ADMIN }
    });

    if (!existingAdmin && adminEmail && adminPassword) {
      const hashedPassword = await bcrypt.hash(adminPassword, Number(config.bcryptSaltRounds) || 12);
      await prisma.user.create({
        data: {
          name: 'Super Admin',
          email: adminEmail,
          password: hashedPassword,
          role: Role.ADMIN,
        }
      });
      console.log('Admin seeded successfully.');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};
