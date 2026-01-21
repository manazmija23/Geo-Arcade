
export interface Country {
  name: string;
  population: number;
  area: number;
  density: number;
  flag: string;
  region: string;
}

export type GameScreen = 'landing' | 'countdown' | 'playing' | 'gameover';
export type GuessType = 'higher' | 'lower';
export type GameMode = 'population' | 'area' | 'density';

export interface HighScores {
  [key: string]: number;
}

// Concrete export to ensure module status
export const VERSION = '1.1.0';
