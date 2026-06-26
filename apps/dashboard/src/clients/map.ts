import { MapAPI } from '@rmf2-ui/client';

export const MapClientOptions: MapAPI.ClientOptions = {
  baseUrl: import.meta.env.VITE_MAP_BASE,
};

export function createMapClient(): MapAPI.Client {
  return new MapAPI.Client(MapClientOptions);
}
