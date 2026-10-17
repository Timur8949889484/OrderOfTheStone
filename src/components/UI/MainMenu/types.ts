// src/components/UI/MainMenu/types.ts

export interface World {
  id: string;
  name: string;
  seed: string;
  player_pos?: { x: number; y: number; z: number };
  time_of_day?: number;
  modified_blocks?: any;
}
