
export interface Country {
  name: string;
  population: number;
  area: number;
  density: number;
  capital: string;
  currency: string;
  flag: string;
  region: string;
}

export type GameMode = 'population' | 'area' | 'density' | 'capital';

/**
 * Added GameScreen to define the available screens in the application.
 */
export type GameScreen = 'landing' | 'countdown' | 'playing' | 'gameover';

/**
 * Added GuessType to define the possible choices in the higher/lower game.
 */
export type GuessType = 'higher' | 'lower';

export interface HighScores {
  [key: string]: number;
}

// Concrete export to ensure module status
export const VERSION = '1.1.0';