export type LifNode = {
  id: string;
  nodeId: string;
  x: number;
  y: number;
  theta?: number;
  description?: string;
};

export type LifEdge = {
  id: string;
  edgeId: string;
  startNodeId: string;
  endNodeId: string;
  maxSpeed?: number;
  description?: string;
};

export type LifStation = {
  id: string;
  stationId: string;
  nodeId: string;
  type?: string;
  description?: string;
};

export type LifLayout = {
  id?: string;
  name: string;
  version?: string;
  nodes: LifNode[];
  edges: LifEdge[];
  stations?: LifStation[];
  raw?: unknown;
};
