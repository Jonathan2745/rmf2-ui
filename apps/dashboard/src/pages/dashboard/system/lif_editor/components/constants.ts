import type { LifDocument, LifNode, LifEdge, LifNodeCreationOptions } from './lif-types';

export const DEFAULT_LIF_MAP_SCALE= 30;
export const MAX_HISTORY = 10; // Max undo history
export const EMPTY_LIF_NODES: LifNode[] = [];
export const EMPTY_LIF_EDGES: LifEdge[] = [];
export const EMPTY_LIF_DOCUMENT: LifDocument = {
  metaInformation: {
    projectIdentification: '',
    creator: '',
    lifVersion: '1.0.0',
  },
  layouts: [],
}

// TODO(Jonathan): maybe add a null option ?
export const DEFAULT_LIF_NODE_CREATION_OPTIONS: LifNodeCreationOptions = {
  dx: 0,
  dy: 0,
  label: '',
  adjustableAxis: 'x',
  axisDirection: '1',
};

export function toRfX(lifX: number): number {
  return lifX * DEFAULT_LIF_MAP_SCALE;
}

export function toRfY(lifY: number): number {
  return -(lifY * DEFAULT_LIF_MAP_SCALE);
}
