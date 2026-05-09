import { PhotoStatus } from "@prisma/client";

export interface IPhotoBulkItem {
  imageUrl: string;
  locationId: string;
  price: number;
  width?: number;
  height?: number;
  format?: string;
  fileSize?: number;
}

export interface IPhotoBulkCreatePayload {
  photographerId: string;
  items: IPhotoBulkItem[];
}

export interface IPhotoQuery {
  page?: string;
  limit?: string;
  status?: PhotoStatus;
  locationId?: string;
}

export interface IPhotoResponse {
  id: string;
  imageUrl: string;
  price: number;
  status: PhotoStatus;
  photographerId: string;
  locationId: string;
  location: {
    id: string;
    name: string;
    state: string;
    region: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
