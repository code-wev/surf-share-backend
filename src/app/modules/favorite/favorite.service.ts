import prisma from "../../utils/prisma";

const toggleFavorite = async (userId: string, photoId: string) => {
  const existingFavorite = await prisma.favorite.findUnique({
    where: {
      userId_photoId: {
        userId,
        photoId,
      },
    },
  });

  if (existingFavorite) {
    // Unfavorite
    await prisma.favorite.delete({
      where: {
        id: existingFavorite.id,
      },
    });
    return { status: "removed" };
  } else {
    // Favorite
    const newFavorite = await prisma.favorite.create({
      data: {
        userId,
        photoId,
      },
    });
    return { status: "added", favorite: newFavorite };
  }
};

const getMyFavorites = async (userId: string) => {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: {
      photo: {
        include: {
          photographer: {
            select: { name: true },
          },
          location: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Extract the photo object so it matches the expected frontend structure
  return favorites.map(fav => fav.photo);
};

const getMyFavoriteIds = async (userId: string) => {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    select: { photoId: true },
  });

  return favorites.map(fav => fav.photoId);
};

export const FavoriteService = {
  toggleFavorite,
  getMyFavorites,
  getMyFavoriteIds,
};
