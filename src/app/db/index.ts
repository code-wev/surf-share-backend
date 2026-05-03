import config from '../config';
import prisma from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

export const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || '';
    const adminPassword = process.env.ADMIN_PASSWORD || '';
    
    const existingAdmin = await prisma.user.findFirst({
      where: { role: Role.ADMIN }
    });

    if (!existingAdmin) {
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
    console.error('Error seeding admin:', error);
  }
};
