import { createNoise2D } from "simplex-noise";
import alea from "alea";
import {
  BLOCK_AIR,
  BLOCK_DIRT,
  BLOCK_GRASS,
  BLOCK_STONE,
  BLOCK_OAK_LOG,
  BLOCK_OAK_LEAVES,
  STONE_DEPTH,
} from "./constants";

let noise2D = createNoise2D();
const heightCache = new Map<string, number>();

export function initTerrainSeed(seed: string) {
  const prng = alea(seed);
  noise2D = createNoise2D(prng);
  heightCache.clear();
}

export function getSurfaceHeight(worldX: number, worldZ: number): number {
  const cacheKey = `${Math.floor(worldX)}_${Math.floor(worldZ)}`;
  if (heightCache.has(cacheKey)) return heightCache.get(cacheKey)!;

  const scale = 0.01;
  const rawNoise = noise2D(worldX * scale, worldZ * scale);
  const normalizedNoise = (rawNoise + 1) / 2;
  const flatness = 2.5;
  const shapedNoise = Math.pow(normalizedNoise, flatness);

  const maxHeight = 20;
  const baseHeight = 2;
  const height = Math.floor(shapedNoise * maxHeight + baseHeight);

  heightCache.set(cacheKey, height);
  return height;
}

export function getDirtDepth(worldX: number, worldZ: number): number {
  const dirtNoise = noise2D(worldX * 0.05 + 500, worldZ * 0.05 + 500);
  return dirtNoise > 0 ? 3 : 2;
}

// ==========================================
// БИОМЫ (Макро-шум)
// ==========================================
export function getBiome(worldX: number, worldZ: number) {
  // НАСТРОЙКА РАЗМЕРА ЛЕСОВ В ЧАНКАХ (1 чанк = 10 блоков)
  // Сейчас стоит 15 чанков (примерно 150 блоков в ширину).
  // Можешь менять это число (например, поставить 8 для маленьких лесов или 30 для огромных)
  const BIOME_SIZE_CHUNKS = 15;
  const scale = 1 / (BIOME_SIZE_CHUNKS * 10);

  const bNoise = noise2D(worldX * scale + 1000, worldZ * scale + 1000);

  if (bNoise < 0.2) return "plains";
  if (bNoise < 0.5) return "forest_small";
  if (bNoise < 0.75) return "forest_medium";
  return "forest_large";
}

export const BOTTOM_STONE_Y = 2 - 3 - STONE_DEPTH;

export function getBlockType(x: number, y: number, z: number): number {
  const surfaceY = getSurfaceHeight(x, z);
  const dirtDepth = getDirtDepth(x, z);
  const dirtBottomY = surfaceY - dirtDepth;

  if (y === surfaceY) return BLOCK_GRASS;
  if (y < surfaceY && y >= dirtBottomY) return BLOCK_DIRT;
  if (y < dirtBottomY && y >= BOTTOM_STONE_Y) return BLOCK_STONE;

  return BLOCK_AIR;
}

// ==========================================
// ГЕНОТИПЫ ДЕРЕВЬЕВ
// ==========================================

// 1. НАХОДИМ И ОБНОВЛЯЕМ ФУНКЦИЮ getTreeData (Шансы спавна)
// 1. ОБНОВЛЕННАЯ ФУНКЦИЯ getTreeData (Делаем леса гуще!)

// ==========================================
// ПОИСК ЦЕНТРОВ ЛЕСОВ ДЛЯ ИГГДРАСИЛЕЙ
// ==========================================
const yggCache = new Map<string, { x: number; z: number }[]>(); // <--- КЭШ (Хранит данные в ОЗУ)

function getYggdrasilsInCell(cellX: number, cellZ: number) {
  const key = `${cellX}_${cellZ}`;
  // Если мы уже считали этот квадрат, отдаем мгновенно!
  if (yggCache.has(key)) return yggCache.get(key)!;

  const prng = alea(`ygg_${cellX}_${cellZ}`);
  const centerX = cellX * 100 + Math.floor(prng() * 100);
  const centerZ = cellZ * 100 + Math.floor(prng() * 100);
  const biome = getBiome(centerX, centerZ);

  if (biome === "plains") {
    yggCache.set(key, []);
    return [];
  }

  let count = 1;
  if (biome === "forest_medium") count = 2;
  if (biome === "forest_large") count = 3;

  const positions = [];
  for (let i = 0; i < count; i++) {
    const offsetX = i === 0 ? 0 : Math.floor((prng() - 0.5) * 35);
    const offsetZ = i === 0 ? 0 : Math.floor((prng() - 0.5) * 35);
    positions.push({ x: centerX + offsetX, z: centerZ + offsetZ });
  }

  // Запоминаем результат навсегда
  yggCache.set(key, positions);
  return positions;
}

export function getTreeData(worldX: number, worldZ: number) {
  if (Math.abs(worldX) % 2 === 1 || Math.abs(worldZ) % 2 === 1) return null;

  const biome = getBiome(worldX, worldZ);
  const treeNoise = noise2D(worldX * 5.13 + 123, worldZ * 5.13 + 456);

  if (biome === "plains") {
    if (treeNoise < 0.995) return null;
  } else {
    if (treeNoise < 0.88) return null;
  }

  // 2. ЗАЩИТНАЯ ЗОНА
  const cellX = Math.floor(worldX / 100);
  const cellZ = Math.floor(worldZ / 100);
  for (let cx = cellX - 1; cx <= cellX + 1; cx++) {
    for (let cz = cellZ - 1; cz <= cellZ + 1; cz++) {
      const yggs = getYggdrasilsInCell(cx, cz);
      for (const ygg of yggs) {
        const dx = worldX - ygg.x;
        const dz = worldZ - ygg.z;

        // ИСПРАВЛЕНИЕ: Увеличиваем радиус защиты с 12 до 35 блоков!
        // Теперь огромные деревья будут стоять на просторных полянах.
        if (dx * dx + dz * dz < 35 * 35) {
          return null;
        }
      }
    }
  }

  const prng = alea(`${worldX}_${worldZ}`);
  const rand = prng();
  let type = 1;

  if (biome === "plains") {
    type = rand > 0.8 ? Math.floor(prng() * 3) + 4 : Math.floor(prng() * 3) + 1;
  } else {
    if (rand > 0.8) {
      type = Math.floor(prng() * 2) + 7;
    } else if (rand > 0.4) {
      type = Math.floor(prng() * 3) + 4;
    } else {
      type = Math.floor(prng() * 3) + 1;
    }
  }

  return { type, prng };
}
// ==========================================
// КИСТИ ДЛЯ РИСОВАНИЯ (Купола, Цилиндры, Ветки)
// ==========================================

type SetBlockFn = (x: number, y: number, z: number, type: number) => void;

// КИСТЬ: Маленькие деревья (Не трогаем)
function drawSmallLeaves(
  cx: number,
  cy: number, // cy - это верхушка ствола
  cz: number,
  prng: () => number, // Передаем генератор для случайных углов
  setBlock: SetBlockFn,
) {
  // Идем сверху вниз (от +1 блока над стволом до -2 блоков вниз)
  for (let y = 1; y >= -2; y--) {
    // Верхние 2 слоя (1 и 0) имеют радиус 1 (размер 3x3)
    // Нижние 2 слоя (-1 и -2) имеют радиус 2 (размер 5x5)
    const radius = y === 1 || y === 0 ? 1 : 2;

    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        // Обрезаем углы, чтобы крона была круглой, а не квадратной
        if (Math.abs(x) === radius && Math.abs(z) === radius) {
          // Самый верхний слой всегда крестик (убираем все 4 угла)
          if (y === 1) continue;
          // Для широких слоев 5x5 шанс убрать угол 50%, чтобы листва была "рваной"
          if (radius === 2 && prng() > 0.5) continue;
        }

        setBlock(
          Math.round(cx + x),
          Math.round(cy + y),
          Math.round(cz + z),
          BLOCK_OAK_LEAVES,
        );
      }
    }
  }
}
// КИСТЬ: Средние Бонсаи (Не трогаем)
function drawBonsaiLeaves(
  cx: number,
  cy: number,
  cz: number,
  radiusXZ: number,
  heightY: number,
  setBlock: SetBlockFn,
) {
  const ceilR = Math.ceil(radiusXZ);
  const ceilH = Math.ceil(heightY);
  const dropY = Math.max(1, Math.floor(radiusXZ * 0.25));

  for (let y = -dropY; y <= ceilH; y++) {
    for (let x = -ceilR; x <= ceilR; x++) {
      for (let z = -ceilR; z <= ceilR; z++) {
        let isInside = false;

        if (y >= 0) {
          if (
            (x * x) / (radiusXZ * radiusXZ) +
              (y * y) / (heightY * heightY) +
              (z * z) / (radiusXZ * radiusXZ) <=
            1.0
          )
            isInside = true;
        } else {
          const lowerRadius = radiusXZ * (1.0 - Math.abs(y) / (dropY + 1));
          if (
            (x * x) / (lowerRadius * lowerRadius) +
              (z * z) / (lowerRadius * lowerRadius) <=
            1.0
          )
            isInside = true;
        }

        if (isInside) {
          const worldX = Math.round(cx + x),
            worldY = Math.round(cy + y),
            worldZ = Math.round(cz + z);
          const distToEdge = Math.sqrt(x * x + z * z) / radiusXZ;
          if (distToEdge > 0.7) {
            const pseudoRandom = Math.abs(
              Math.sin(worldX * 13.3 + worldY * 7.7 + worldZ * 29.9),
            );
            if (pseudoRandom < 0.2) continue;
          }
          setBlock(worldX, worldY, worldZ, BLOCK_OAK_LEAVES);
        }
      }
    }
  }
}

// НОВАЯ КИСТЬ: Гигантская листва (Для больших деревьев)
// Дает +60% объема, глубоко свисает и "обнимает" толстые ветки.
function drawGiantLeaves(
  cx: number,
  cy: number,
  cz: number,
  radiusXZ: number,
  heightY: number,
  dropY: number,
  setBlock: SetBlockFn,
) {
  const ceilR = Math.ceil(radiusXZ);
  const ceilH = Math.ceil(heightY);

  for (let y = -dropY; y <= ceilH; y++) {
    for (let x = -ceilR; x <= ceilR; x++) {
      for (let z = -ceilR; z <= ceilR; z++) {
        let isInside = false;

        if (y >= 0) {
          // Верхняя часть кроны
          if (
            (x * x) / (radiusXZ * radiusXZ) +
              (y * y) / (heightY * heightY) +
              (z * z) / (radiusXZ * radiusXZ) <=
            1.0
          ) {
            isInside = true;
          }
        } else {
          // НИЖНЯЯ ЧАСТЬ (Пухлая и глубокая)
          // Используем квадратичную формулу (t * t), чтобы листва не сужалась сразу, а свисала массивным "колоколом"
          const t = Math.abs(y) / (dropY + 1);
          const lowerRadius = radiusXZ * (1.0 - t * t);
          if (
            (x * x) / (lowerRadius * lowerRadius) +
              (z * z) / (lowerRadius * lowerRadius) <=
            1.0
          ) {
            isInside = true;
          }
        }

        if (isInside) {
          const worldX = Math.round(cx + x);
          const worldY = Math.round(cy + y);
          const worldZ = Math.round(cz + z);

          // Рваные края (шум)
          const distToEdge = Math.sqrt(x * x + z * z) / radiusXZ;
          if (distToEdge > 0.75) {
            const pseudoRandom = Math.abs(
              Math.sin(worldX * 13.3 + worldY * 7.7 + worldZ * 29.9),
            );
            if (pseudoRandom < 0.25) continue;
          }

          setBlock(worldX, worldY, worldZ, BLOCK_OAK_LEAVES);
        }
      }
    }
  }
}

function drawCylinder(
  cx: number,
  cy: number,
  cz: number,
  height: number,
  radius: number,
  type: number,
  setBlock: SetBlockFn,
) {
  const rSq = radius * radius;
  const ceilR = Math.ceil(radius);
  for (let y = 0; y < height; y++) {
    for (let x = -ceilR; x <= ceilR; x++) {
      for (let z = -ceilR; z <= ceilR; z++) {
        if (x * x + z * z <= rSq) {
          setBlock(
            Math.round(cx + x),
            Math.round(cy + y),
            Math.round(cz + z),
            type,
          );
        }
      }
    }
  }
}

function drawBranch(
  x0: number,
  y0: number,
  z0: number,
  length: number,
  pitch: number,
  yaw: number,
  thickness: number,
  setBlock: SetBlockFn,
) {
  const x1 = x0 + length * Math.sin(pitch) * Math.cos(yaw);
  const y1 = y0 + length * Math.cos(pitch);
  const z1 = z0 + length * Math.sin(pitch) * Math.sin(yaw);

  const dist = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2 + (z1 - z0) ** 2);
  const steps = Math.ceil(dist * 1.5);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = x0 + (x1 - x0) * t;
    const cy = y0 + (y1 - y0) * t;
    const cz = z0 + (z1 - z0) * t;

    if (thickness <= 0.5) {
      setBlock(Math.round(cx), Math.round(cy), Math.round(cz), BLOCK_OAK_LOG);
    } else {
      drawCylinder(cx, cy, cz, 1, thickness, BLOCK_OAK_LOG, setBlock);
    }
  }

  return { ex: x1, ey: y1, ez: z1 };
}

// ==========================================
// ФУНКЦИЯ-СБОРЩИК ДЕРЕВА
// ==========================================

export function buildTree(
  rx: number,
  ry: number,
  rz: number,
  setBlock: SetBlockFn,
) {
  const treeData = getTreeData(rx, rz);
  if (!treeData) return;
  const { type, prng } = treeData;

  if (type >= 1 && type <= 3) {
    const h = Math.floor(prng() * 3) + 4;
    // ry - 2: ствол начинается на 2 блока под землей. h + 2: компенсируем высоту.
    drawCylinder(rx, ry - 2, rz, h + 2, 0.5, BLOCK_OAK_LOG, setBlock);
    drawSmallLeaves(rx, ry + h, rz, prng, setBlock);
  } else if (type >= 4 && type <= 6) {
    const h = Math.floor(prng() * 5) + 8;
    drawCylinder(rx, ry - 2, rz, h + 2, 0.5, BLOCK_OAK_LOG, setBlock);
    const branches = Math.floor(prng() * 3) + 2;
    for (let i = 0; i < branches; i++) {
      const startY = ry + h * 0.5 + prng() * (h * 0.3);
      const end = drawBranch(
        rx,
        startY,
        rz,
        prng() * 4 + 4,
        prng() * 0.8 + 0.5,
        prng() * Math.PI * 2,
        0.5,
        setBlock,
      );
      drawBonsaiLeaves(end.ex, end.ey, end.ez, 3.5, 2.5, setBlock);
    }
    drawBonsaiLeaves(rx, ry + h, rz, 4.5, 3.5, setBlock);
  } else if (type >= 7 && type <= 8) {
    const h = Math.floor(prng() * 11) + 15;
    drawCylinder(rx, ry - 2, rz, h + 2, 1.2, BLOCK_OAK_LOG, setBlock);
    const branches = Math.floor(prng() * 4) + 4;
    for (let i = 0; i < branches; i++) {
      const startY = ry + h * 0.4 + prng() * (h * 0.5);
      const end = drawBranch(
        rx,
        startY,
        rz,
        prng() * 8 + 8,
        prng() * 0.8 + 0.6,
        prng() * Math.PI * 2,
        1.2,
        setBlock,
      );
      drawGiantLeaves(end.ex, end.ey, end.ez, 7.5, 4.5, 4, setBlock);
    }
    drawGiantLeaves(rx, ry + h + 1, rz, 9.0, 6.0, 5, setBlock);
  }
}

function drawYggdrasil(
  rx: number,
  ry: number,
  rz: number,
  prng: any,
  setBlock: SetBlockFn,
) {
  const h = Math.floor(prng() * 25) + 40;
  // Иггдрасиль уходит под землю аж на 4 блока (глубокие корни)
  drawCylinder(rx, ry - 4, rz, h + 4, 2.5, BLOCK_OAK_LOG, setBlock);

  const branches = Math.floor(prng() * 5) + 6;
  for (let i = 0; i < branches; i++) {
    const startY = ry + h * 0.3 + prng() * (h * 0.6);
    const length = prng() * 15 + 15;
    const pitch = prng() * 0.9 + 0.5;
    const yaw = prng() * Math.PI * 2;

    const end = drawBranch(rx, startY, rz, length, pitch, yaw, 1.8, setBlock);
    drawGiantLeaves(end.ex, end.ey, end.ez, 11, 6.5, 6, setBlock);

    for (let j = 0; j < 2; j++) {
      const subYaw = yaw + (prng() - 0.5) * 2;
      const subEnd = drawBranch(
        end.ex,
        end.ey,
        end.ez,
        length * 0.5,
        pitch - 0.2,
        subYaw,
        0.8,
        setBlock,
      );
      drawGiantLeaves(subEnd.ex, subEnd.ey, subEnd.ez, 8.5, 5.5, 5, setBlock);
    }
  }
  drawGiantLeaves(rx, ry + h + 2, rz, 14, 8, 6, setBlock);
}

// Эта функция вызывается из воркера для сеток 100x100
export function buildYggdrasils(
  cellX: number,
  cellZ: number,
  setBlock: SetBlockFn,
) {
  const yggs = getYggdrasilsInCell(cellX, cellZ);

  for (const ygg of yggs) {
    // Создаем отдельный рандом для формы конкретного дерева
    const prng = alea(`ygg_shape_${ygg.x}_${ygg.z}`);
    const wy = getSurfaceHeight(ygg.x, ygg.z) + 1;
    drawYggdrasil(ygg.x, wy, ygg.z, prng, setBlock);
  }
}
