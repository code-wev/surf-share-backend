export interface IPhotoBulkItem {
  imageUrl: string;
  locationId: string;
  price: number;
}

export interface IPhotoBulkCreatePayload {
  photographerId: string;
  items: IPhotoBulkItem[];
}
