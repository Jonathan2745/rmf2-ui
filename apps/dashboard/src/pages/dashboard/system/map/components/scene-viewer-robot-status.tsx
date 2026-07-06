import { Text, Box, HStack } from '@chakra-ui/react';
import type { BoxProps } from '@chakra-ui/react';
import { SceneViewerPanel } from './scene-viewer-panel';
import type { SceneViewerPanelProps } from './scene-viewer-panel';
import type {
  WaypointCoords,
  RobotStatus,
  RobotMotionStatus,
} from './robot-types';

export interface SceneViewerRobotStatusItemProps
  extends Omit<BoxProps, 'children'> {
  robotStatus: RobotStatus;
}

export function SceneViewerRobotStatusItem(
  props: SceneViewerRobotStatusItemProps,
) {
  const { robotStatus, ...rest } = props;
  const {
    id: robotId,
    name: robotName,
    status: motionStatus,
    position: robotPosition,
    target: targetWaypoint,
    waypointId,
    waypointLabel,
    waypointIndex,
    waypointCount,
    blockedBy,
  } = robotStatus;

  function getMotionStatusColor(motionStatus: RobotMotionStatus) {
    if (motionStatus === 'blocked') return 'fg.error';
    if (motionStatus === 'moving') return 'blue.500';
    if (motionStatus === 'arrived') return 'green.500';
    return 'fg.muted';
  }

  function formatCoord(value: WaypointCoords) {
    return `x ${value.x.toFixed(3)} · y ${value.y.toFixed(3)} · z ${value.z.toFixed(3)}`;
  }

  return (
    <Box
      key={robotId}
      px={2}
      py={1.5}
      rounded="md"
      bg="bg.subtle"
      borderWidth="1px"
      borderColor="border.subtle"
      {...rest}
    >
      <HStack justify="space-between" align="start" gap={3}>
        <Box>
          <Text fontSize="xs" fontWeight="semibold">
            {robotName}
          </Text>

          <Text fontSize="xs" color="fg.muted" fontFamily="mono">
            {robotId}
          </Text>
        </Box>

        <Text
          fontSize="xs"
          fontWeight="semibold"
          textTransform="uppercase"
          color={getMotionStatusColor(motionStatus)}
        >
          {motionStatus}
        </Text>
      </HStack>

      <Text mt={1} fontSize="xs" color="fg.muted" fontFamily="mono">
        {formatCoord(robotPosition)}
      </Text>

      {waypointCount !== undefined && (
        <Text mt={1} fontSize="xs" color="fg.muted">
          Waypoint {(waypointIndex ?? 0) + 1}/{waypointCount}:{' '}
          {waypointLabel ?? waypointId}
        </Text>
      )}

      {targetWaypoint && (
        <Text mt={1} fontSize="xs" color="fg.muted" fontFamily="mono">
          → {formatCoord(targetWaypoint)}
        </Text>
      )}

      {blockedBy && (
        <Text mt={1} fontSize="xs" color="fg.error">
          Blocked by {blockedBy}
        </Text>
      )}
    </Box>
  );
}

export interface SceneViewerRobotStatusProps extends SceneViewerPanelProps {
  // TODO(anyone): selectively turn on and off controls
}

export function SceneViewerRobotStatusPanel(
  props: SceneViewerRobotStatusProps,
) {
  const { ...rest } = props;

  const defaultRobotStatuses: RobotStatus[] = [
    {
      id: 'my-robot',
      name: 'My Robot',
      status: 'idle',
      position: { x: 1.23, y: 3.21, z: 1.232 },
      target: { x: 1.42, y: 2.17, z: 9.72 },
      waypointId: 1,
      waypointLabel: 'my-waypoint',
      waypointIndex: 2,
      waypointCount: 2,
      blockedBy: 'my other robot',
    },
  ];
  return (
    <SceneViewerPanel variant="right-panel" {...rest}>
      <Text fontSize="sm" fontWeight="semibold">
        Robots
      </Text>

      {defaultRobotStatuses.map((robotStatus) => (
        <SceneViewerRobotStatusItem
          key={robotStatus.id}
          robotStatus={robotStatus}
        />
      ))}
    </SceneViewerPanel>
  );
}
