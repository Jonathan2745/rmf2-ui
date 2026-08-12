export type LoadStatus = 'loading' | 'success' | 'error';
export type LoadMessage = {
  title: string;
  description?: string;
};

export type LifNodePosition = { x: number; y: number };

export type LifVehicleTypeNodeProperties = {
  vehicleTypeId: string;
};

export type LifActionParameter = {
  key: string;
  value: string;
};

export type LifNodeAction = {
  actionType: string;
  actionDescription?: string;
  blockingType?: 'NONE' | 'SOFT' | 'HARD';
  actionParameters?: LifActionParameter[];
};

export type LifNode = {
  nodeId: string;
  nodeName: string;
  mapId: string;
  nodePosition: LifNodePosition;
  vehicleTypeNodeProperties?: LifVehicleTypeNodeProperties[];
  nodeActions?: LifNodeAction[];
};

export type LifVehicleTypeEdgeProperties = {
  vehicleTypeId: string;
  vehicleOrientation?: number;
  orientationType?: string;
  rotationAllowed?: boolean;
  maxSpeed?: number;
};

export type LifEdge = {
  edgeId: string;
  edgeName: string;
  startNodeId: string;
  endNodeId: string;
  vehicleTypeEdgeProperties?: LifVehicleTypeEdgeProperties[];
};

export type LifStationPosition = { x: number; y: number };

export type LifStation = {
  stationId: string;
  stationName: string;
  stationDescription?: string;
  stationHeight?: number;
  stationPosition: LifStationPosition;
  interactionNodeIds?: string[];
};

export type LifLayout = {
  layoutId: string;
  layoutName: string;
  layoutVersion: string;
  layoutLevelId: string;
  layoutDescription?: string;
  nodes: LifNode[];
  edges: LifEdge[];
  stations?: LifStation[];
};

export type LifDocument = {
  metaInformation: {
    projectIdentification: string;
    creator: string;
    exportTimestamp?: string;
    lifVersion: string;
  };
  layouts: LifLayout[];
};

export type LifSelection =
  | { kind: 'node'; nodeId: string }
  | { kind: 'edge'; edgeId: string }
  | null;

export type LifMapTool = 'select' | 'createNode' | 'createEdge';

export type RobotPathWaypoint = {
  id: string | number;
  x: number;
  y: number;
  z: number;
  label?: string;
};

export type RobotPathConfig = {
  id: string;
  name?: string;
  color?: string;
  path?: RobotPathWaypoint[];
  loop?: boolean;
  speed?: number;
  enabled?: boolean;
  startWaypointIndex?: number;
  coordinateSystem?: 'navigation' | 'world';
  position?: { x: number; y: number; z: number };
};

export type RobotsPayload = {
  coordinateSystem: 'navigation' | 'world';
  robots: RobotPathConfig[];
};

export type EditorTab = 'nodes' | 'edges' | 'robots';

export type LifNodeCreationOption = {
  nodeId: string;
  nodeName: string;
  label: string;
  adjustableAxis: 'x' | 'y';
  axisDirection: 1 | -1;
  defaultPosition: LifNodePosition;
};

export type AdjacentNodePreview = {
  nodeId: string;
  nodePosition: LifNodePosition;
};

export type MapImageMeta = {
  url: string;
  resolution: number;
  origin: [number, number];
  width: number;
  height: number;
};

export type ImageOverlay = {
  url: string;
  opacity: number;
  naturalW: number;
  naturalH: number;
  scale: number;
  x: number;
  y: number;
};
