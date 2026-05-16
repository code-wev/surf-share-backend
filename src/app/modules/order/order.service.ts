import prisma from "../../utils/prisma";

const getOrdersByUserId = async (userId: string) => {
  return await prisma.order.findMany({
    where: { userId },
    include: {
      items: {
        include: {
          photo: {
            include: {
              location: true,
              photographer: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const OrderService = {
  getOrdersByUserId,
};
