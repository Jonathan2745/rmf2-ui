import { type IMapClient, type ResolvedSceneAssetUrls } from '@/clients/map';

export type { ResolvedSceneAssetUrls };

export async function resolveSceneAssetUrls(
  client: IMapClient,
): Promise<ResolvedSceneAssetUrls> {
  return client.getSceneAssets();
}
