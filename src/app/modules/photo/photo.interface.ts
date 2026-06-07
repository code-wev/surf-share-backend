import { PhotoStatus } from "@prisma/client";

export interface IPhotoBulkItem {
  title?: string | null;
  imageUrl: string;
  originalUrl?: string | null;
  locationId: string;
  price: number;
  timeKey?: string;
  capturedAt?: Date;
  width?: number;
  height?: number;
  format?: string;
  fileSize?: number;
}

export interface IPhotoQuery {
  page?: string;
  limit?: string;
  status?: PhotoStatus;
  locationId?: string;
  photographerId?: string;
}

export interface IPhotoBulkCreatePayload {
  photographerId: string;
  items: IPhotoBulkItem[];
}
