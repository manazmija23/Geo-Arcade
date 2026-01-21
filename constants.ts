import { GameMode } from './types.ts';

export const BASE_TIME = 10;
export const MIN_TIME = 3;
export const REGIONS = ['World', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];

export const MODES: { value: GameMode; label: string; unit: string }[] = [
  { value: 'population', label: 'POPULATION', unit: '' },
  { value: 'area', label: 'AREA', unit: ' KM²' },
  { value: 'density', label: 'DENSITY', unit: '/KM²' },
  { value: 'capital', label: 'CAPITAL POP.', unit: '' }
];

export const COLORS = {
  cyan: '#22d3ee',
  pink: '#ec4899',
  yellow: '#facc15',
  green: '#22c55e',
  red: '#ef4444',
  slate: '#0f172a'
};