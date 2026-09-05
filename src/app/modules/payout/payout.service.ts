import prisma from "../../utils/prisma";

interface GetPayoutsOptions {
  status?: string;
  search?: string;
}

const getAllPayouts = async (options?: GetPayoutsOptions) => {
  const { status, search } = options || {};

  const whereClause: any = {
    order: {
      status: "PAID",
    },
    photographerEarnings: {
      gt: 0,
    },
  };

  if (status && status !== "ALL") {
    whereClause.payoutStatus = status;
  }

  if (search && search.trim()) {
    const searchTerm = search.trim();
    whereClause.OR = [
      {
        photo: {
          title: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      },
      {
        photo: {
          photographer: {
            name: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
      },
      {
        photo: {
          photographer: {
            email: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
      },
    ];
  }

  const items = await prisma.orderItem.findMany({
    where: whereClause,
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

  return items.map((item) => ({
    id: item.id,
    photoId: item.photo.id,
    photoTitle: item.photo.title || "Untitled",
    photoUrl: item.photo.imageUrl,
    earnedAmount: item.photographerEarnings,
    payoutStatus: item.payoutStatus,
    soldAt: item.order.createdAt,
    photographer: {
      id: item.photo.photographer.id,
      name: item.photo.photographer.name,
      email: item.photo.photographer.email,
      manualBankDetails: item.photo.photographer.manualBankDetails,
    },
  }));
};

const getPendingPayouts = async () => {
  return getAllPayouts({ status: "PENDING" });
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
  getAllPayouts,
  getPendingPayouts,
  markAsPaid,
};
