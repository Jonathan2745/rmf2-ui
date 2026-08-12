import type { LifEdge, LifNode } from './lif-types';

export const LIF_MAP_SCALE = 30;
export const MAX_HISTORY = 50;
export const EMPTY_LIF_NODES: LifNode[] = [];
export const EMPTY_LIF_EDGES: LifEdge[] = [];

export function toRfX(lifX: number): number {
  return lifX * LIF_MAP_SCALE;
}

export function toRfY(lifY: number): number {
  return -(lifY * LIF_MAP_SCALE);
}

export function toLifX(rfX: number): number {
  return rfX / LIF_MAP_SCALE;
}

export function toLifY(rfY: number): number {
  return -(rfY / LIF_MAP_SCALE);
}
