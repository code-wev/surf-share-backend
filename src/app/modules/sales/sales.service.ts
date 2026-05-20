import prisma from "../../utils/prisma";

const getMySales = async (userId: string, locationId?: string) => {
  try {
    // Get all photos for this photographer to count total and pending
    const allPhotos = await prisma.photo.findMany({
      where: {
        photographerId: userId,
      },
      select: {
        status: true,
        createdAt: true,
      },
    });

    const totalPhotos = allPhotos.length;
    const pendingPhotos = allPhotos.filter((p) => p.status === "PENDING").length;

    // Get photos that have been sold
    const soldPhotos = await prisma.photo.findMany({
      where: {
        photographerId: userId,
        ...(locationId && { locationId }),
        orderItems: {
          some: {
            order: {
              status: "PAID",
            },
          },
        },
      },
      include: {
        location: true,
        orderItems: {
          where: {
            order: {
              status: "PAID",
            },
          },
          select: {
            id: true,
            price: true,
            photographerEarnings: true,
            platformFee: true,
            order: {
              select: {
                id: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const items = soldPhotos.map((photo) => {
      const totalDownloads = photo.orderItems?.length || 0;
      const earningsUsd = (photo.orderItems || []).reduce(
        (acc, item) => acc + (item.photographerEarnings || 0),
        0,
      );
      const commissionUsd = (photo.orderItems || []).reduce(
        (acc, item) => acc + (item.platformFee || 0),
        0,
      );

      const locationName = photo.location?.name || "Unknown Location";
      const locationState = photo.location?.state || "Unknown";

      return {
        id: photo.id,
        photoUrl: photo.imageUrl,
        name: locationName,
        location: `${locationName}, ${locationState}`,
        locationId: photo.locationId,
        uploadedAt: photo.createdAt ? photo.createdAt.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        priceUsd: photo.price || 0,
        status: photo.status ? photo.status.toLowerCase() : "pending",
        commissionUsd,
        totalDownloads,
        earningsUsd,
        // Metadata
        resolution: photo.width && photo.height ? `${photo.width} x ${photo.height} px` : undefined,
        format: photo.format?.toUpperCase(),
        size: photo.fileSize ? `${(photo.fileSize / (1024 * 1024)).toFixed(2)} MB` : undefined,
      };
    });

    const totalEarnings = items.reduce((acc, item) => acc + item.earningsUsd, 0);
    const totalSales = items.reduce(
      (acc, item) =>
        acc +
        item.totalDownloads * item.priceUsd,
      0,
    );
    const totalSoldPhotos = items.length;
    const totalDownloadsCount = items.reduce((acc, item) => acc + item.totalDownloads, 0);

    // Trend calculation
    const now = new Date();
    const firstDayCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const prevMonthSales = await prisma.orderItem.aggregate({
      _sum: { photographerEarnings: true, price: true },
      where: {
        photo: { photographerId: userId },
        order: { status: "PAID", createdAt: { lt: firstDayCurrentMonth } },
      },
    });

    const prevMonthPhotos = await prisma.photo.count({
      where: {
        photographerId: userId,
        createdAt: { lt: firstDayCurrentMonth },
      },
    });

    const prevMonthSold = await prisma.photo.count({
      where: {
        photographerId: userId,
        createdAt: { lt: firstDayCurrentMonth },
        orderItems: { some: { order: { status: "PAID" } } },
      },
    });

    const getTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? "+ 100%" : "+ 0%";
      const diff = ((current - previous) / previous) * 100;
      return `${diff >= 0 ? "+ " : "- "}${Math.abs(Math.round(diff))}%`;
    };

    const stats = {
      totalEarnings,
      totalSales,
      totalSoldPhotos,
      totalDownloadsCount,
      totalPhotos,
      pendingPhotos,
      trends: {
        earnings: getTrend(totalEarnings, prevMonthSales._sum.photographerEarnings || 0),
        photos: getTrend(totalPhotos, prevMonthPhotos),
        soldPhotos: getTrend(totalSoldPhotos, prevMonthSold),
      },
    };

    // Calculate chart data (last 12 months)
    const chartData = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleString("default", { month: "short" });
      const year = d.getFullYear();
      const month = d.getMonth();

      let monthlyEarnings = 0;
      soldPhotos.forEach((photo) => {
        photo.orderItems.forEach((item) => {
          const orderDate = new Date(item.order.createdAt);
          if (
            orderDate.getFullYear() === year &&
            orderDate.getMonth() === month
          ) {
            monthlyEarnings += item.photographerEarnings || 0;
          }
        });
      });

      chartData.push({
        label: monthLabel,
        value: Number(monthlyEarnings.toFixed(2)),
      });
    }

    return {
      stats,
      items,
      chartData,
    };
  } catch (error) {
    console.error("CRITICAL Error in SalesService.getMySales:", error);
    throw error;
  }
};

export const SalesService = {
  getMySales,
};
