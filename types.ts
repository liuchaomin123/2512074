export enum TreeState {
  CHAOS = 'CHAOS',
  FORMED = 'FORMED',
}

export interface DualPosition {
  chaos: [number, number, number];
  target: [number, number, number];
  rotationChaos: [number, number, number];
  rotationTarget: [number, number, number];
}

export const CONFIG = {
  treeHeight: 14,
  treeRadius: 5,
  particleCount: 8000,
  ornamentCount: 150,
  colors: {
    emerald: '#005C29',
    gold: '#FFD700',
    red: '#8B0000',
    warmWhite: '#FFFDD0'
  }
};