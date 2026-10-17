/// <reference lib="webworker" />
import {
  getSurfaceHeight,
  getDirtDepth,
  initTerrainSeed,
  buildTree,
  buildYggdrasils,
} from "../../utils/terrain";
import {
  BLOCK_AIR,
  BLOCK_GRASS,
  BLOCK_DIRT,
  BLOCK_STONE,
  BLOCK_OAK_LOG,
  BLOCK_OAK_LEAVES,
} from "../../utils/constants";

const BLOCK_SIZE = 1.5;
const H = BLOCK_SIZE / 2;
const LIGHT_PAD = 12;

// ИСПРАВЛЕНИЕ: Осветлили общую тень мира, чтобы низ листвы не был черным
const COLOR_SHADOW = { r: 0.55, g: 0.55, b: 0.55 };
const COLOR_SUN = { r: 1.0, g: 1.0, b: 1.0 };

// Классические тени Майнкрафта
const FACES = [
  {
    dir: [1, 0, 0],
    shade: 0.8,
    corners: [
      [H, -H, H],
      [H, -H, -H],
      [H, H, -H],
      [H, H, H],
    ],
  }, // Восток
  {
    dir: [-1, 0, 0],
    shade: 0.8,
    corners: [
      [-H, -H, -H],
      [-H, -H, H],
      [-H, H, H],
      [-H, H, -H],
    ],
  }, // Запад
  {
    dir: [0, 1, 0],
    shade: 1.0,
    corners: [
      [-H, H, H],
      [H, H, H],
      [H, H, -H],
      [-H, H, -H],
    ],
  }, // Верх
  {
    dir: [0, -1, 0],
    shade: 0.5,
    corners: [
      [-H, -H, -H],
      [H, -H, -H],
      [H, -H, H],
      [-H, -H, H],
    ],
  }, // Низ
  {
    dir: [0, 0, 1],
    shade: 0.6,
    corners: [
      [-H, -H, H],
      [H, -H, H],
      [H, H, H],
      [-H, H, H],
    ],
  }, // Юг
  {
    dir: [0, 0, -1],
    shade: 0.6,
    corners: [
      [H, -H, -H],
      [-H, -H, -H],
      [-H, H, -H],
      [H, H, -H],
    ],
  }, // Север
];

const UVS = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

let cached3DSize = 0;
let brokenBlocksMap: Uint8Array,
  lightMap: Uint8Array,
  queue: Int32Array,
  blockTypeMap: Uint8Array;

function ensureBuffers(w: number, d: number, total3DCells: number) {
  if (cached3DSize < total3DCells) {
    cached3DSize = total3DCells;
    brokenBlocksMap = new Uint8Array(total3DCells);
    lightMap = new Uint8Array(total3DCells);
    queue = new Int32Array(total3DCells * 4);
    blockTypeMap = new Uint8Array(total3DCells);
  } else {
    brokenBlocksMap.fill(0);
    lightMap.fill(0);
    queue.fill(0);
    blockTypeMap.fill(0);
  }
}

self.onmessage = (event: MessageEvent) => {
  const { chunkX, chunkZ, chunkSize, seed, modifiedBlocksBuffer } = event.data;
  if (seed) initTerrainSeed(seed);

  const W = chunkSize + LIGHT_PAD * 2;
  const D = chunkSize + LIGHT_PAD * 2;
  const MIN_Y = -31;
  const MAX_Y = 128;
  const H_SIZE = MAX_Y - MIN_Y + 1;
  const total3DCells = W * D * H_SIZE;

  const get3DIndex = (lx: number, ly: number, lz: number) =>
    lx + LIGHT_PAD + (lz + LIGHT_PAD) * W + (ly - MIN_Y) * W * D;

  ensureBuffers(W, D, total3DCells);

  if (modifiedBlocksBuffer && modifiedBlocksBuffer.length > 0) {
    const minX = chunkX * chunkSize - LIGHT_PAD,
      maxX = (chunkX + 1) * chunkSize + LIGHT_PAD - 1;
    const minZ = chunkZ * chunkSize - LIGHT_PAD,
      maxZ = (chunkZ + 1) * chunkSize + LIGHT_PAD - 1;
    for (let i = 0; i < modifiedBlocksBuffer.length; i += 3) {
      const bx = modifiedBlocksBuffer[i],
        by = modifiedBlocksBuffer[i + 1],
        bz = modifiedBlocksBuffer[i + 2];
      if (
        bx >= minX &&
        bx <= maxX &&
        bz >= minZ &&
        bz <= maxZ &&
        by >= MIN_Y &&
        by <= MAX_Y
      ) {
        brokenBlocksMap[
          get3DIndex(bx - chunkX * chunkSize, by, bz - chunkZ * chunkSize)
        ] = 1;
      }
    }
  }

  for (let x = -LIGHT_PAD; x < chunkSize + LIGHT_PAD; x++) {
    for (let z = -LIGHT_PAD; z < chunkSize + LIGHT_PAD; z++) {
      const wX = chunkX * chunkSize + x,
        wZ = chunkZ * chunkSize + z;
      const surfaceY = getSurfaceHeight(wX, wZ),
        dirtBottomY = surfaceY - getDirtDepth(wX, wZ);
      for (let y = MIN_Y; y <= surfaceY; y++) {
        if (y > MAX_Y) break;
        const idx3d = get3DIndex(x, y, z);
        if (brokenBlocksMap[idx3d] === 1) continue;
        if (y === surfaceY) blockTypeMap[idx3d] = BLOCK_GRASS;
        else if (y >= dirtBottomY) blockTypeMap[idx3d] = BLOCK_DIRT;
        else blockTypeMap[idx3d] = BLOCK_STONE;
      }
    }
  }

  const setBlock = (wx: number, wy: number, wz: number, type: number) => {
    const lx = wx - chunkX * chunkSize,
      lz = wz - chunkZ * chunkSize;
    if (
      lx >= -LIGHT_PAD &&
      lx < chunkSize + LIGHT_PAD &&
      lz >= -LIGHT_PAD &&
      lz < chunkSize + LIGHT_PAD &&
      wy >= MIN_Y &&
      wy <= MAX_Y
    ) {
      const idx3d = get3DIndex(lx, wy, lz);
      if (brokenBlocksMap[idx3d] !== 1) {
        if (type === BLOCK_OAK_LOG || blockTypeMap[idx3d] === BLOCK_AIR)
          blockTypeMap[idx3d] = type;
      }
    }
  };

  const NORMAL_RADIUS = 28;
  for (let x = -NORMAL_RADIUS; x < chunkSize + NORMAL_RADIUS; x++) {
    for (let z = -NORMAL_RADIUS; z < chunkSize + NORMAL_RADIUS; z++) {
      const wX = chunkX * chunkSize + x,
        wZ = chunkZ * chunkSize + z;
      buildTree(wX, getSurfaceHeight(wX, wZ) + 1, wZ, setBlock);
    }
  }

  const YGG_RADIUS = 65;
  const minCellX = Math.floor((chunkX * chunkSize - YGG_RADIUS) / 100);
  const maxCellX = Math.floor(
    (chunkX * chunkSize + chunkSize + YGG_RADIUS) / 100,
  );
  const minCellZ = Math.floor((chunkZ * chunkSize - YGG_RADIUS) / 100);
  const maxCellZ = Math.floor(
    (chunkZ * chunkSize + chunkSize + YGG_RADIUS) / 100,
  );

  for (let cx = minCellX; cx <= maxCellX; cx++) {
    for (let cz = minCellZ; cz <= maxCellZ; cz++)
      buildYggdrasils(cx, cz, setBlock);
  }

  const isSolidForLight = (lx: number, ly: number, lz: number) => {
    if (ly < MIN_Y) return true;
    if (ly > MAX_Y) return false;
    const bType = blockTypeMap[get3DIndex(lx, ly, lz)];
    return bType !== BLOCK_AIR && bType !== BLOCK_OAK_LEAVES;
  };

  let highestSolidY = MIN_Y;
  for (let x = -LIGHT_PAD; x < chunkSize + LIGHT_PAD; x++) {
    for (let z = -LIGHT_PAD; z < chunkSize + LIGHT_PAD; z++) {
      for (let y = MAX_Y; y >= MIN_Y; y--) {
        if (blockTypeMap[get3DIndex(x, y, z)] !== BLOCK_AIR) {
          if (y > highestSolidY) highestSolidY = y;
          break;
        }
      }
    }
  }

  let head = 0,
    tail = 0;
  const lightTopY = Math.min(MAX_Y, highestSolidY + 2);

  for (let x = -LIGHT_PAD; x < chunkSize + LIGHT_PAD; x++) {
    for (let z = -LIGHT_PAD; z < chunkSize + LIGHT_PAD; z++) {
      let sunLevel = 15;
      for (let y = MAX_Y; y > lightTopY; y--)
        lightMap[get3DIndex(x, y, z)] = 15;
      for (let y = lightTopY; y >= MIN_Y; y--) {
        if (isSolidForLight(x, y, z)) sunLevel = 0;
        lightMap[get3DIndex(x, y, z)] = sunLevel;
        if (sunLevel === 15) {
          queue[tail++] = x;
          queue[tail++] = y;
          queue[tail++] = z;
          queue[tail++] = sunLevel;
        }
      }
    }
  }

  const dirs = [1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1];
  while (head < tail) {
    const x = queue[head++],
      y = queue[head++],
      z = queue[head++],
      l = queue[head++];
    if (l <= 1) continue;
    for (let i = 0; i < 18; i += 3) {
      const nx = x + dirs[i],
        ny = y + dirs[i + 1],
        nz = z + dirs[i + 2];
      if (
        nx < -LIGHT_PAD ||
        nx >= chunkSize + LIGHT_PAD ||
        nz < -LIGHT_PAD ||
        nz >= chunkSize + LIGHT_PAD ||
        ny < MIN_Y ||
        ny > lightTopY
      )
        continue;
      if (!isSolidForLight(nx, ny, nz)) {
        const nIdx = get3DIndex(nx, ny, nz);
        if (l - 1 > lightMap[nIdx]) {
          lightMap[nIdx] = l - 1;
          queue[tail++] = nx;
          queue[tail++] = ny;
          queue[tail++] = nz;
          queue[tail++] = l - 1;
        }
      }
    }
  }

  const getLight = (nx: number, ny: number, nz: number) => {
    if (ny > MAX_Y) return 15;
    if (
      nx < -LIGHT_PAD ||
      nx >= chunkSize + LIGHT_PAD ||
      nz < -LIGHT_PAD ||
      nz >= chunkSize + LIGHT_PAD ||
      ny < MIN_Y
    )
      return 0;
    return lightMap[get3DIndex(nx, ny, nz)];
  };

  const buffer = {
    pos: [] as number[],
    norm: [] as number[],
    uv: [] as number[],
    col: [] as number[],
    ind: [] as number[],
  };

  // ИСПРАВЛЕНИЕ АРТЕФАКТОВ: Отступ в 0.2% от края текстуры в атласе
  const UV_PAD = 0.002;

  for (let x = 0; x < chunkSize; x++) {
    for (let z = 0; z < chunkSize; z++) {
      for (let y = MIN_Y; y <= highestSolidY; y++) {
        const bType = blockTypeMap[get3DIndex(x, y, z)];
        if (bType === BLOCK_AIR) continue;

        let matTop, matSide, matBottom;
        if (bType === BLOCK_GRASS) {
          matTop = 0;
          matSide = 1;
          matBottom = 2;
        } else if (bType === BLOCK_DIRT) {
          matTop = 2;
          matSide = 2;
          matBottom = 2;
        } else if (bType === BLOCK_STONE) {
          matTop = 3;
          matSide = 3;
          matBottom = 3;
        } else if (bType === BLOCK_OAK_LOG) {
          matTop = 5;
          matSide = 4;
          matBottom = 5;
        } else if (bType === BLOCK_OAK_LEAVES) {
          matTop = 6;
          matSide = 6;
          matBottom = 6;
        } else continue;

        const posX = (chunkX * chunkSize + x) * BLOCK_SIZE;
        const posY = (y - 0.5) * BLOCK_SIZE;
        const posZ = (chunkZ * chunkSize + z) * BLOCK_SIZE;

        const maxNeighborLight = Math.max(
          getLight(x + 1, y, z),
          getLight(x - 1, y, z),
          getLight(x, y + 1, z),
          getLight(x, y - 1, z),
          getLight(x, y, z + 1),
          getLight(x, y, z - 1),
        );
        const intensity = Math.pow(maxNeighborLight / 15.0, 1.6);

        for (let f = 0; f < 6; f++) {
          const face = FACES[f];
          const nx = x + face.dir[0],
            ny = y + face.dir[1],
            nz = z + face.dir[2];

          let shouldDraw = false;
          if (ny > MAX_Y) {
            shouldDraw = true;
          } else if (ny >= MIN_Y) {
            const neighborType = blockTypeMap[get3DIndex(nx, ny, nz)];

            // Если сосед - воздух или листва, мы всегда рисуем грань.
            // Это сделает крону густой и объемной изнутри!
            if (
              neighborType === BLOCK_AIR ||
              neighborType === BLOCK_OAK_LEAVES
            ) {
              shouldDraw = true;
            }
          }

          if (shouldDraw) {
            const matIdx = f === 2 ? matTop : f === 3 ? matBottom : matSide;
            const vOffset = buffer.pos.length / 3;

            // В файле src/components/Chunk/chunk.worker.ts

            let r =
              (COLOR_SHADOW.r + (COLOR_SUN.r - COLOR_SHADOW.r) * intensity) *
              face.shade;
            let g =
              (COLOR_SHADOW.g + (COLOR_SUN.g - COLOR_SHADOW.g) * intensity) *
              face.shade;
            let b =
              (COLOR_SHADOW.b + (COLOR_SUN.b - COLOR_SHADOW.b) * intensity) *
              face.shade;

            // МАГИЯ ЗДЕСЬ: Делаем её сильно темнее (меняем 0.65 на 0.45 или 0.4)
            if (bType === BLOCK_OAK_LEAVES) {
              r *= 0.45;
              g *= 0.45;
              b *= 0.45;
            }

            // Вычисляем координаты с отступом (UV_PAD), чтобы картинки не "протекали" друг на друга

            // Вычисляем координаты с отступом (UV_PAD), чтобы картинки не "протекали" друг на друга
            const uvV_bottom = 1.0 - (matIdx + 1) / 8 + UV_PAD;
            const uvV_top = 1.0 - matIdx / 8 - UV_PAD;

            for (let i = 0; i < 4; i++) {
              buffer.pos.push(
                posX + face.corners[i][0],
                posY + face.corners[i][1],
                posZ + face.corners[i][2],
              );
              buffer.norm.push(face.dir[0], face.dir[1], face.dir[2]);
              buffer.col.push(r, g, b);

              const uvX = UVS[i][0] === 0 ? UV_PAD : 1.0 - UV_PAD;
              const uvY = UVS[i][1] === 0 ? uvV_bottom : uvV_top;
              buffer.uv.push(uvX, uvY);
            }
            buffer.ind.push(
              vOffset,
              vOffset + 1,
              vOffset + 2,
              vOffset,
              vOffset + 2,
              vOffset + 3,
            );
          }
        }
      }
    }
  }

  const payload: any = {
    chunkX,
    chunkZ,
    blockTypeMap: blockTypeMap.slice().buffer,
    geometry: {
      pos: new Float32Array(buffer.pos).buffer,
      norm: new Float32Array(buffer.norm).buffer,
      uv: new Float32Array(buffer.uv).buffer,
      col: new Float32Array(buffer.col).buffer,
      ind: new Uint32Array(buffer.ind).buffer,
    },
  };

  const transferables: ArrayBuffer[] = [
    payload.blockTypeMap,
    payload.geometry.pos,
    payload.geometry.norm,
    payload.geometry.uv,
    payload.geometry.col,
    payload.geometry.ind,
  ];

  self.postMessage(payload, transferables);
};
