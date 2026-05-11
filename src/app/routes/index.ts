import { Router } from "express";

import { UserRoutes } from "../modules/user/user.routes";
import { AuthRoutes } from "../modules/auth/auth.routes";
import { AdvertisementRoutes } from "../modules/advertisement/advertisement.routes";
import { LocationRoutes } from "../modules/location/location.routes";
import { PhotoRoutes } from "../modules/photo/photo.routes";
import { FavoriteRoutes } from "../modules/favorite/favorite.routes";
import { ContactRoutes } from "../modules/contact/contact.routes";

const router = Router();

const moduleRoutes = [
  {
    path: "/users",
    route: UserRoutes,
  },
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/advertisement",
    route: AdvertisementRoutes,
  },
  {
    path: "/locations",
    route: LocationRoutes,
  },
  {
    path: "/photos",
    route: PhotoRoutes,
  },
  {
    path: "/favorites",
    route: FavoriteRoutes,
  },
  {
    path: "/contact",
    route: ContactRoutes,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
