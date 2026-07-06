export type WaypointCoords = { x: number; y: number; z: number };
export type RobotMotionStatus =
  | 'idle'
  | 'moving'
  | 'blocked'
  | 'disabled'
  | 'arrived';
export type RobotStatus = {
  id: string;
  name: string;
  status: RobotMotionStatus;
  position: WaypointCoords;
  target?: WaypointCoords;
  waypointId?: string | number;
  waypointLabel?: string;
  waypointIndex?: number;
  waypointCount?: number;
  blockedBy?: string;
};
