import { Router } from "express";

import { UserRoutes } from "../modules/user/user.routes";
import { AuthRoutes } from "../modules/auth/auth.routes";
import { AdvertisementRoutes } from "../modules/advertisement/advertisement.routes";
import { LocationRoutes } from "../modules/location/location.routes";
import { PhotoRoutes } from "../modules/photo/photo.routes";
import { FavoriteRoutes } from "../modules/favorite/favorite.routes";
import { CheckoutRoutes } from "../modules/checkout/checkout.routes";
import { ContactRoutes } from "../modules/contact/contact.routes";
import { OrderRoutes } from "../modules/order/order.routes";
import { SalesRoutes } from "../modules/sales/sales.routes";
import { DashboardRoutes } from "../modules/dashboard/dashboard.routes";
import { SubscriptionRoutes } from "../modules/subscription/subscription.routes";
import { StripeRoutes } from "../modules/stripe/stripe.routes";

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
    path: "/checkout",
    route: CheckoutRoutes,
  },
  {
    path: "/contact",
    route: ContactRoutes,
  },
  {
    path: "/orders",
    route: OrderRoutes,
  },
  {
    path: "/sales",
    route: SalesRoutes,
  },
  {
    path: "/dashboard",
    route: DashboardRoutes,
  },
  {
    path: "/subscriptions",
    route: SubscriptionRoutes,
  },
  {
    path: "/stripe",
    route: StripeRoutes,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;

