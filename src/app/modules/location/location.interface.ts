export interface ILocationCreatePayload {
  name: string;
  parentSpot?: string;
  region: string;
  state: string;
  latitude: number;
  longitude: number;
}

export interface ILocationUpdatePayload extends Partial<ILocationCreatePayload> {}
