export type LifNode = {
  node_id: string;
  x: number;
  y: number;
  theta?: number;
  allowed_devation_xy?: number;
  allowed_devation_theta?: number;
  map_description?: string;
};

export type LifEdge = {
  edge_id: string;
  start_node_id: string;
  end_node_id: string;
  bidirectional?: boolean;
  max_speed?: number;
  length?: number;
  description?: string;
};

export type LifMapInfo = {
  map_id?: string;
  map_version?: string;
  map_status?: string;
  map_descriptor?: string;
};

export type LifDocument = {
  metaInformation?: Record<string, unknown>;
  layouts?: unknown[];
  map_info?: LifMapInfo;
  nodes: LifNode[];
  edges: LifEdge[];
};
