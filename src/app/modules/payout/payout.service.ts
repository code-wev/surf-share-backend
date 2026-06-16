import prisma from "../../utils/prisma";

const getPendingPayouts = async () => {
  const pendingItems = await prisma.orderItem.findMany({
    where: {
      order: {
        status: "PAID",
      },
      payoutStatus: "PENDING",
      photographerEarnings: {
        gt: 0,
      },
    },
    include: {
      photo: {
        include: {
          photographer: {
            select: {
              id: true,
              name: true,
              email: true,
              manualBankDetails: true,
            },
          },
        },
      },
      order: {
        select: {
          id: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      order: {
        createdAt: "desc",
      },
    },
  });

  return pendingItems.map((item) => ({
    id: item.id,
    photoId: item.photo.id,
    photoTitle: item.photo.title || "Untitled",
    photoUrl: item.photo.imageUrl,
    earnedAmount: item.photographerEarnings,
    soldAt: item.order.createdAt,
    photographer: {
      id: item.photo.photographer.id,
      name: item.photo.photographer.name,
      email: item.photo.photographer.email,
      manualBankDetails: item.photo.photographer.manualBankDetails,
    },
  }));
};

const markAsPaid = async (itemIds: string[]) => {
  const result = await prisma.orderItem.updateMany({
    where: {
      id: {
        in: itemIds,
      },
      payoutStatus: "PENDING", // Only update if currently pending
    },
    data: {
      payoutStatus: "MANUAL_SUCCESS",
    },
  });

  return { count: result.count };
};

export const PayoutService = {
  getPendingPayouts,
  markAsPaid,
};
