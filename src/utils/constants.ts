// src/utils/constants.ts

// Определяем, зашел ли пользователь с телефона/планшета
export const IS_MOBILE =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );

export const MAP_SIZE = 5000;
export const CHUNK_SIZE = 10;

// ИСПРАВЛЕНИЕ: Дальность прорисовки динамическая. 15 для ПК, 6 для мобилок.
export const RENDER_DISTANCE = IS_MOBILE ? 6 : 15;

export const WORLD_CHUNKS_AXIS = MAP_SIZE / CHUNK_SIZE;
export const SPAWN_RADIUS_CHUNKS = RENDER_DISTANCE;
export const INITIAL_SPAWN_CHUNKS_COUNT = Math.pow(
  SPAWN_RADIUS_CHUNKS * 2 + 1,
  2,
);

export const FOG_END = RENDER_DISTANCE * CHUNK_SIZE * 1.5;
export const FOG_START = Math.floor(FOG_END * 0.6);
export const MAX_VISIBLE_DISTANCE = FOG_END + 5;

// --- ТИПЫ БЛОКОВ ---
export const BLOCK_AIR = 0;
export const BLOCK_GRASS = 1;
export const BLOCK_DIRT = 2;
export const BLOCK_STONE = 3;
export const BLOCK_OAK_LOG = 4;
export const BLOCK_OAK_LEAVES = 5;

// --- ГЛУБИНА КАМНЯ ---
export const STONE_DEPTH = 30;
