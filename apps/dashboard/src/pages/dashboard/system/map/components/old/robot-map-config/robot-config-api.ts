import { type IMapClient } from '@/clients/map';
import { type RobotConfig } from '../robot-types';
import { normalizeRobotConfigs } from './robot-config-normalize';

export async function fetchRobotConfigs(
  client: IMapClient,
): Promise<RobotConfig[]> {
  const response = await client.getRobots();
  return normalizeRobotConfigs(response);
}
