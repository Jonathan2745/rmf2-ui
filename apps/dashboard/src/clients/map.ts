import { MapAPI } from '@rmf2-ui/client';

export const MapClientOptions: MapAPI.ClientOptions = {
  baseUrl: import.meta.env.VITE_MAP_BASE,
};

export function useMapClient() {
  const client = new MapAPI.Client(MapClientOptions);
  return client;
}
