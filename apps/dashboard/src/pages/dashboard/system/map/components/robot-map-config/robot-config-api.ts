import { type MapAPI } from '@rmf2-ui/client';
import { type RobotConfig } from '../robot-types';
import { normalizeRobotConfigs } from './robot-config-normalize';

export async function fetchRobotConfigs(
  client: MapAPI.Client,
): Promise<RobotConfig[]> {
  const response = await client.getRobots();
  return normalizeRobotConfigs(response);
}
