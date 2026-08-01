import { OrderStatus, Role, UserStatus } from '@prisma/client';
import prisma from '../../utils/prisma';

type TopContributor = {
  id: string;
  name: string;
  photosLabel: string;
  earnings: string;
  avatarSrc: string;
};

type TopLocation = {
  id: string;
  name: string;
  photosLabel: string;
  progress: number;
};

type WeeklyUploadBar = {
  dayLabel: string;
  uploads: number;
};

const getTrend = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? '+ 100%' : '+ 0%';
  const diff = ((current - previous) / previous) * 100;
  return `${diff >= 0 ? '+ ' : '- '}${Math.abs(Math.round(diff))}%`;
};

const getDashboardStats = async (role: Role) => {
  const now = new Date();
  const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers,
    totalPhotos,
    totalEarningsResult,
    totalSalesResult,
    platformRevenueResult,
    photographerCount,
    activeUsers,
    totalLocationsCount,
    downloadedPhotos,
    pendingPhotos,
    // Cumulative stats before current month
    prevUsers,
    prevPhotos,
    prevEarningsResult,
    prevSalesResult,
    prevPlatformRevenueResult,
    prevDownloadedPhotos,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.photo.count(),
    prisma.orderItem.aggregate({
      _sum: { photographerEarnings: true },
      where: { order: { status: OrderStatus.PAID } },
    }),
    prisma.orderItem.aggregate({
      _sum: { price: true },
      where: { order: { status: OrderStatus.PAID } },
    }),
    prisma.orderItem.aggregate({
      _sum: { platformFee: true },
      where: { order: { status: OrderStatus.PAID } },
    }),
    prisma.user.count({ where: { role: Role.PHOTOGRAPHER } }),
    prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
    prisma.location.count(),
    prisma.orderItem.count({ where: { order: { status: OrderStatus.PAID } } }),
    prisma.photo.count({ where: { status: 'PENDING' } }),

    // Cumulative stats before current month
    prisma.user.count({ where: { createdAt: { lt: firstDayCurrentMonth } } }),
    prisma.photo.count({ where: { createdAt: { lt: firstDayCurrentMonth } } }),
    prisma.orderItem.aggregate({
      _sum: { photographerEarnings: true },
      where: {
        order: { status: OrderStatus.PAID, createdAt: { lt: firstDayCurrentMonth } },
      },
    }),
    prisma.orderItem.aggregate({
      _sum: { price: true },
      where: {
        order: { status: OrderStatus.PAID, createdAt: { lt: firstDayCurrentMonth } },
      },
    }),
    prisma.orderItem.aggregate({
      _sum: { platformFee: true },
      where: {
        order: { status: OrderStatus.PAID, createdAt: { lt: firstDayCurrentMonth } },
      },
    }),
    prisma.orderItem.count({
      where: {
        order: { status: OrderStatus.PAID, createdAt: { lt: firstDayCurrentMonth } },
      },
    }),
  ]);

  const totalEarnings = totalEarningsResult._sum.photographerEarnings || 0;
  const totalSales = totalSalesResult._sum.price || 0;
  const platformRevenue = platformRevenueResult._sum.platformFee || 0;

  const prevEarnings = prevEarningsResult._sum.photographerEarnings || 0;
  const prevSales = prevSalesResult._sum.price || 0;
  const prevPlatformRevenue = prevPlatformRevenueResult._sum.platformFee || 0;

  // Aggregate monthly earnings for the last 12 months
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const earningsData = await prisma.orderItem.findMany({
    where: {
      order: {
        createdAt: { gte: twelveMonthsAgo },
        status: OrderStatus.PAID,
      },
    },
    select: {
      photographerEarnings: true,
      order: {
        select: {
          createdAt: true,
        },
      },
    },
  });

  const monthlyEarnings = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    const monthLabel = d.toLocaleString('default', { month: 'short' });
    const year = d.getFullYear();
    const m = d.getMonth();
    const val = earningsData
      .filter((e) => e.order.createdAt.getMonth() === m && e.order.createdAt.getFullYear() === year)
      .reduce((acc, curr) => acc + (curr.photographerEarnings || 0), 0);
    return { label: monthLabel, value: Number(val.toFixed(2)) };
  });

  const weeklyDates = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date;
  });

  const weeklyUploadCounts = await Promise.all(
    weeklyDates.map((date) => {
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      return prisma.photo.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      });
    }),
  );

  const weeklyUploadActivity: WeeklyUploadBar[] = weeklyDates.map((date, index) => ({
    dayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
    uploads: weeklyUploadCounts[index] ?? 0,
  }));

  // Get top contributors by photo count
  const topContributorsRaw = await prisma.photo.groupBy({
    by: ['photographerId'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5,
  });

  const topContributorIds = topContributorsRaw.map((c) => c.photographerId);
  const users = await prisma.user.findMany({
    where: { id: { in: topContributorIds } },
    select: { id: true, name: true, profileImageUrl: true },
  });

  const earningsByPhotographer = await prisma.orderItem.findMany({
    where: {
      order: {
        status: OrderStatus.PAID,
      },
    },
    select: {
      photographerEarnings: true,
      photo: {
        select: {
          photographerId: true,
        },
      },
    },
  });

  const earningsMap = earningsByPhotographer.reduce<Record<string, number>>((accumulator, item) => {
    const photographerId = item.photo.photographerId;
    accumulator[photographerId] =
      (accumulator[photographerId] ?? 0) + (item.photographerEarnings ?? 0);
    return accumulator;
  }, {});

  const contributorMap = new Map(users.map((user) => [user.id, user]));

  const topContributors: TopContributor[] = topContributorsRaw
    .map((contributor) => {
      const user = contributorMap.get(contributor.photographerId);

      if (!user) {
        return null;
      }

      const photoCount = contributor._count.id;
      const earningsValue = earningsMap[contributor.photographerId] ?? 0;

      return {
        id: user.id,
        name: user.name,
        photosLabel: `${photoCount} photos`,
        earnings: `$${earningsValue.toLocaleString()}`,
        avatarSrc: user.profileImageUrl ?? '/home/latest/latest1.jpg',
      };
    })
    .filter((contributor): contributor is TopContributor => contributor !== null);

  // Top Locations
  const topLocationsRaw = await prisma.photo.groupBy({
    by: ['locationId'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 8,
  });

  const topLocationIds = topLocationsRaw.map((l) => l.locationId);
  const locations = await prisma.location.findMany({
    where: { id: { in: topLocationIds } },
    select: { id: true, name: true, region: true, state: true },
  });

  const locationMap = new Map(locations.map((l) => [l.id, l]));
  const maxPhotos = topLocationsRaw[0]?._count.id || 1;

  const topLocations: TopLocation[] = topLocationsRaw
    .map((loc) => {
      const location = locationMap.get(loc.locationId);
      if (!location) return null;

      return {
        id: location.id,
        name: `${location.name}, ${location.state}`,
        photosLabel: `${loc._count.id} photos`,
        progress: loc._count.id / maxPhotos,
      };
    })
    .filter((l): l is TopLocation => l !== null);

  const stats =
    role === Role.ADMIN
      ? [
          {
            label: 'Total Revenue',
            value: `$${totalSales.toLocaleString()}`,
            trendLabel: getTrend(totalSales, prevSales),
            trendTone: totalSales >= prevSales ? 'positive' : 'negative',
          },
          {
            label: 'Platform Revenue',
            value: `$${platformRevenue.toLocaleString()}`,
            trendLabel: getTrend(platformRevenue, prevPlatformRevenue),
            trendTone: platformRevenue >= prevPlatformRevenue ? 'positive' : 'negative',
          },
          {
            label: 'Total Active User',
            value: activeUsers.toString(),
            trendLabel: getTrend(activeUsers, prevUsers),
            trendTone: 'positive',
          },
          {
            label: 'Total Photographers',
            value: photographerCount.toString(),
            trendLabel: getTrend(photographerCount, 0),
            trendTone: 'positive',
          },
          {
            label: 'Total Location',
            value: totalLocationsCount.toString(),
            trendLabel: getTrend(totalLocationsCount, 0),
            trendTone: 'positive',
          },
          {
            label: 'Total Photos',
            value: totalPhotos.toString(),
            trendLabel: getTrend(totalPhotos, prevPhotos),
            trendTone: totalPhotos >= prevPhotos ? 'positive' : 'negative',
          },
          {
            label: 'Downloaded Photos',
            value: downloadedPhotos.toString(),
            trendLabel: getTrend(downloadedPhotos, prevDownloadedPhotos),
            trendTone: downloadedPhotos >= prevDownloadedPhotos ? 'positive' : 'negative',
          },
          {
            label: 'Pending photos',
            value: pendingPhotos.toString(),
            trendLabel: '+ 0%',
            trendTone: 'negative',
          },
        ]
      : [
          {
            label: 'Total Users',
            value: totalUsers.toString(),
            trendLabel: getTrend(totalUsers, prevUsers),
            trendTone: totalUsers >= prevUsers ? 'positive' : 'negative',
          },
          {
            label: 'Total Photos',
            value: totalPhotos.toString(),
            trendLabel: getTrend(totalPhotos, prevPhotos),
            trendTone: totalPhotos >= prevPhotos ? 'positive' : 'negative',
          },
          {
            label: 'Downloaded Photos',
            value: downloadedPhotos.toString(),
            trendLabel: getTrend(downloadedPhotos, prevDownloadedPhotos),
            trendTone: downloadedPhotos >= prevDownloadedPhotos ? 'positive' : 'negative',
          },
          {
            label: 'Pending photos',
            value: pendingPhotos.toString(),
            trendLabel: '+ 0%',
            trendTone: 'negative',
          },
        ];

  return {
    stats,
    chartData: monthlyEarnings,
    weeklyUploadActivity,
    topContributors,
    topLocations,
  };
};

export const DashboardService = {
  getDashboardStats,
};
