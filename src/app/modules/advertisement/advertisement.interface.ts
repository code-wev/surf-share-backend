export interface IAdvertisementPayload {
  advertisementURL: string;
}

export interface IAdvertisementResponse {
  id: string;
  imageUrl: string;
  linkUrl: string;
  createdAt: Date;
  updatedAt: Date;
}
