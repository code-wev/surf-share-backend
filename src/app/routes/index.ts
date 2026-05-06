import { Router } from "express";

import { UserRoutes } from "../modules/user/user.routes";
import { AuthRoutes } from "../modules/auth/auth.routes";
import { AdvertisementRoutes } from "../modules/advertisement/advertisement.routes";
import { LocationRoutes } from "../modules/location/location.routes";

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
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
