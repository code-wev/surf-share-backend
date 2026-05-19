import prisma from "../../utils/prisma";
import { Role, UserStatus } from "@prisma/client";

type TopContributor = {
  id: string;
  name: string;
  photosLabel: string;
  earnings: string;
  avatarSrc: string;
};

const getDashboardStats = async (role: Role) => {
  const [
    totalUsers,
    totalPhotos,
    totalEarnings,
    totalSales,
    platformRevenue,
    photographerCount,
    activeUsers,
    totalLocations,
    downloadedPhotos,
    pendingPhotos,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.photo.count(),
    prisma.orderItem.aggregate({ _sum: { photographerEarnings: true } }),
    prisma.orderItem.aggregate({
      _sum: { price: true },
      where: {
        order: {
          status: "PAID",
        },
      },
    }),
    prisma.orderItem.aggregate({
      _sum: { platformFee: true },
      where: {
        order: {
          status: "PAID",
        },
      },
    }),
    prisma.user.count({ where: { role: Role.PHOTOGRAPHER } }),
    prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
    prisma.location.count(),
    prisma.orderItem.count({
      where: {
        order: {
          status: "PAID",
        },
      },
    }),
    prisma.photo.count({ where: { status: "PENDING" } }),
  ]);

  // Aggregate monthly earnings for the last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const earnings = await prisma.orderItem.findMany({
    where: {
      order: {
        createdAt: { gte: sixMonthsAgo },
        status: "PAID",
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

  const monthlyEarnings = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.toLocaleString("default", { month: "short" });
    const year = d.getFullYear();
    const m = d.getMonth();
    const val = earnings
      .filter(
        (e) =>
          e.order.createdAt.getMonth() === m &&
          e.order.createdAt.getFullYear() === year,
      )
      .reduce((acc, curr) => acc + (curr.photographerEarnings || 0), 0);
    return { label: month, value: val };
  });

  // Get top contributors by photo count
  const topContributorsRaw = await prisma.photo.groupBy({
    by: ["photographerId"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
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
        status: "PAID",
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

  const earningsMap = earningsByPhotographer.reduce<Record<string, number>>(
    (accumulator, item) => {
      const photographerId = item.photo.photographerId;
      accumulator[photographerId] =
        (accumulator[photographerId] ?? 0) + (item.photographerEarnings ?? 0);
      return accumulator;
    },
    {},
  );

  const contributorMap = new Map(users.map((user) => [user.id, user]));

  const topContributors: TopContributor[] = topContributorsRaw
    .map((contributor) => {
      const user = contributorMap.get(contributor.photographerId);

      if (!user) {
        return null;
      }

      const photoCount = contributor._count.id;
      const earnings = earningsMap[contributor.photographerId] ?? 0;

      return {
        id: user.id,
        name: user.name,
        photosLabel: `${photoCount} photos`,
        earnings: `$${earnings.toLocaleString()}`,
        avatarSrc: user.profileImageUrl ?? "/home/latest/latest1.jpg",
      };
    })
    .filter(
      (contributor): contributor is TopContributor => contributor !== null,
    );

  return {
    stats:
      role === Role.ADMIN
        ? [
            {
              label: "Total Revenue",
              value: `$${(totalSales._sum.price || 0).toLocaleString()}`,
            },
            {
              label: "Platform Revenue",
              value: `$${(platformRevenue._sum.platformFee || 0).toLocaleString()}`,
            },
            { label: "Total Active User", value: activeUsers.toString() },
            { label: "Total Contributor", value: photographerCount.toString() },
            { label: "Total Location", value: totalLocations.toString() },
            { label: "Total Photos", value: totalPhotos.toString() },
            { label: "Downloaded Photos", value: downloadedPhotos.toString() },
            { label: "Pending photos", value: pendingPhotos.toString() },
          ]
        : [
            {
              label: "Total Users",
              value: totalUsers.toString(),
            },
            {
              label: "Total Photos",
              value: totalPhotos.toString(),
            },
            { label: "Downloaded Photos", value: downloadedPhotos.toString() },
            { label: "Pending photos", value: pendingPhotos.toString() },
          ],
    chartData: monthlyEarnings,
    topContributors,
  };
};

export const DashboardService = {
  getDashboardStats,
};
