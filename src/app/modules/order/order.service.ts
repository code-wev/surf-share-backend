import prisma from "../../utils/prisma";
import AppError from "../../errors/AppError";

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

const deleteOrder = async (userId: string, orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId, userId },
  });

  if (!order) {
    throw new AppError(404, "Order not found.");
  }

  if (order.status === "PAID") {
    throw new AppError(400, "Cannot delete a paid order.");
  }

  return await prisma.order.delete({
    where: { id: orderId },
  });
};

export const OrderService = {
  getOrdersByUserId,
  deleteOrder,
};
