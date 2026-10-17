import { blockStore } from "./blockStore";

// Храним бинарные карты блоков для каждого чанка
export const chunkDataStore = new Map<string, Uint8Array>();

const CHUNK_SIZE = 10;
const LIGHT_PAD = 12;
const W = CHUNK_SIZE + LIGHT_PAD * 2;
const D = CHUNK_SIZE + LIGHT_PAD * 2;
const MIN_Y = -31;
const MAX_Y = 128;

// КЭШ: Сохраняем последний запрошенный чанк. Физика проверяет сотни блоков
// внутри одного чанка, поэтому это ускорит поиск в 100+ раз!
let lastChunkKey = "";
let lastChunkX = -999999;
let lastChunkZ = -999999;

export function getGlobalBlock(
  worldX: number,
  worldY: number,
  worldZ: number,
): number {
  const wx = Math.round(worldX);
  const wy = Math.round(worldY);
  const wz = Math.round(worldZ);

  if (blockStore.isBlockBroken(wx, wy, wz)) return 0;

  const chunkX = Math.floor(wx / CHUNK_SIZE);
  const chunkZ = Math.floor(wz / CHUNK_SIZE);

  let chunkMap;
  if (chunkX === lastChunkX && chunkZ === lastChunkZ) {
    chunkMap = chunkDataStore.get(lastChunkKey);
  } else {
    lastChunkKey = `${chunkX},${chunkZ}`;
    lastChunkX = chunkX;
    lastChunkZ = chunkZ;
    chunkMap = chunkDataStore.get(lastChunkKey);
  }

  // Если чанка нет, возвращаем -1 (невидимая стена), а не 0 (воздух)
  if (!chunkMap) return -1;

  const lx = wx - chunkX * CHUNK_SIZE;
  const lz = wz - chunkZ * CHUNK_SIZE;

  if (wy < MIN_Y || wy > MAX_Y) return 0;

  const idx = lx + LIGHT_PAD + (lz + LIGHT_PAD) * W + (wy - MIN_Y) * W * D;
  return chunkMap[idx] || 0;
}
