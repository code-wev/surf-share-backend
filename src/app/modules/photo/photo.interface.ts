export interface IPhotoBulkItem {
  imageUrl: string;
  locationId: string;
  price: number;
  timeKey?: string;
  capturedAt?: Date;
  width?: number;
  height?: number;
  format?: string;
  fileSize?: number;
}

export interface IPhotoBulkCreatePayload {
  photographerId: string;
  items: IPhotoBulkItem[];
}
