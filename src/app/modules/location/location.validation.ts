import { z } from "zod";

const createLocation = z.object({
  body: z.object({
    name: z.string({ message: "Name is required" }).min(1),
    parentSpot: z.string().optional().or(z.literal("")),
    region: z.string({ message: "Region is required" }).min(1),
    state: z.string({ message: "State is required" }).min(1),
    // FormData sends numbers as strings, so we coerce them
    latitude: z.coerce.number({ message: "Latitude is required" }),
    longitude: z.coerce.number({ message: "Longitude is required" }),
  }),
});

const updateLocation = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    parentSpot: z.string().optional().or(z.literal("")),
    region: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
  }),
});

export const LocationValidation = {
  createLocation,
  updateLocation,
};
