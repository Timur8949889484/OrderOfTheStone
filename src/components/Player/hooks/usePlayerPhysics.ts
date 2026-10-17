import { useRef, useEffect } from "react";
import * as THREE from "three";
import { initTerrainSeed } from "../../../utils/terrain";
import { getGlobalBlock } from "../../../store/chunkStore";

import { IS_MOBILE } from "../../../utils/constants";
import { mobileControls } from "../../../utils/mobileControls";

const BLOCK_SIZE = 1.5;
const PLAYER_HEIGHT_BLOCKS = 1.8;

const getBlockY = (yCoord: number) => Math.floor(yCoord / BLOCK_SIZE) + 1;

const frontVector = new THREE.Vector3();
const direction = new THREE.Vector3();
const upVector = new THREE.Vector3(0, 1, 0);
const rightVector = new THREE.Vector3();

const GRID_SLOTS = 9;
const gridXs = new Int32Array(GRID_SLOTS);
const gridZs = new Int32Array(GRID_SLOTS);
let gridCount = 0;

interface UsePlayerPhysicsProps {
  posRef: React.MutableRefObject<{ x: number; y: number; z: number }>;
  keysPressed: React.MutableRefObject<{ [key: string]: boolean }>;
  isPaused: boolean;
  mapSize: number;
  chunkSize: number;
  onChunkChange: (chunkX: number, chunkZ: number) => void;
  camera: THREE.Camera;
  worldId?: string | null;
  seed?: string;
}

export function usePlayerPhysics({
  posRef,
  keysPressed,
  isPaused,
  mapSize,
  chunkSize,
  onChunkChange,
  camera,
  worldId,
  seed = "default_seed",
}: UsePlayerPhysicsProps) {
  const velocityY = useRef(0);
  const lastChunk = useRef({
    x: Math.floor(posRef.current.x / (chunkSize * BLOCK_SIZE)),
    z: Math.floor(posRef.current.z / (chunkSize * BLOCK_SIZE)),
  });

  useEffect(() => {
    if (seed) {
      initTerrainSeed(seed);
    }
  }, [seed]);

  useEffect(() => {
    if (worldId) {
      velocityY.current = 0;
      const startChunkX = Math.floor(
        posRef.current.x / (chunkSize * BLOCK_SIZE),
      );
      const startChunkZ = Math.floor(
        posRef.current.z / (chunkSize * BLOCK_SIZE),
      );
      lastChunk.current = { x: startChunkX, z: startChunkZ };
    }
  }, [worldId, chunkSize, posRef]);

  const isSolidBlockOptimized = (
    worldX: number,
    blockYIndex: number,
    worldZ: number,
  ) => {
    const bType = getGlobalBlock(worldX, blockYIndex, worldZ);
    // ИСПРАВЛЕНИЕ: -1 это непрогруженный чанк. Считаем его твердым как камень!
    if (bType === -1) return true;

    return bType !== 0;
  };

  const fillPlayerGrids = (posX: number, posZ: number) => {
    gridCount = 0;
    // ИСПРАВЛЕНИЕ: Радиус коллайдера игрока уменьшен до 0.28 (игрок достаточно узкий).
    // Это снижает вероятность проверки сетки 3x3 и чаще оставляет 2x2 (4 блока вместо 9)
    const r = 0.28;
    const minX = Math.round((posX - r) / BLOCK_SIZE);
    const maxX = Math.round((posX + r) / BLOCK_SIZE);
    const minZ = Math.round((posZ - r) / BLOCK_SIZE);
    const maxZ = Math.round((posZ + r) / BLOCK_SIZE);

    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (gridCount < GRID_SLOTS) {
          gridXs[gridCount] = x;
          gridZs[gridCount] = z;
          gridCount++;
        }
      }
    }
  };

  const getGroundYAt = (posX: number, posZ: number, playerY: number) => {
    fillPlayerGrids(posX, posZ);
    const startBlockY = getBlockY(playerY + 0.5);
    let maxGround = -10 * BLOCK_SIZE;

    for (let i = 0; i < gridCount; i++) {
      const gx = gridXs[i];
      const gz = gridZs[i];

      // Просто сканируем вниз от позиции игрока. Ищем первый твердый блок.
      for (let y = startBlockY; y >= -10; y--) {
        if (isSolidBlockOptimized(gx, y, gz)) {
          const groundY = y * BLOCK_SIZE;
          if (groundY > maxGround) maxGround = groundY;
          break;
        }
      }
    }
    return maxGround;
  };

  const canFitAt = (posX: number, posY: number, posZ: number) => {
    fillPlayerGrids(posX, posZ);
    const feetYBlock = getBlockY(posY + 0.05);
    const headYBlock = getBlockY(
      posY + PLAYER_HEIGHT_BLOCKS * BLOCK_SIZE - 0.1,
    );

    for (let bY = feetYBlock; bY <= headYBlock; bY++) {
      for (let i = 0; i < gridCount; i++) {
        const gx = gridXs[i];
        const gz = gridZs[i];
        // Вызываем функцию строго с 3 аргументами!
        if (isSolidBlockOptimized(gx, bY, gz)) {
          return false;
        }
      }
    }
    return true;
  };

  const updatePhysics = (dt: number) => {
    if (isPaused) return;

    const keys = keysPressed.current;
    const speed = 11 * dt;

    camera.getWorldDirection(frontVector);
    frontVector.y = 0;
    frontVector.normalize();

    rightVector.crossVectors(frontVector, upVector).normalize();

    const groundBeforeMove = getGroundYAt(
      posRef.current.x,
      posRef.current.z,
      posRef.current.y,
    );
    const isGrounded =
      posRef.current.y <= groundBeforeMove + 0.1 && velocityY.current <= 0;

    let forward = 0;
    let right = 0;

    // ИСПРАВЛЕНИЕ: Читаем либо джойстик (на мобилках), либо клавиатуру (на ПК)
    if (IS_MOBILE) {
      forward = mobileControls.forward;
      right = mobileControls.right;
    } else {
      if (keys["KeyW"]) forward += 1;
      if (keys["KeyS"]) forward -= 1;
      if (keys["KeyA"]) right -= 1;
      if (keys["KeyD"]) right += 1;
    }

    if (keys["KeyW"]) forward += 1;
    if (keys["KeyS"]) forward -= 1;
    if (keys["KeyA"]) right -= 1;
    if (keys["KeyD"]) right += 1;

    if (forward !== 0 || right !== 0) {
      direction.set(0, 0, 0);
      if (forward !== 0) direction.addScaledVector(frontVector, forward);
      if (right !== 0) direction.addScaledVector(rightVector, right);

      direction.normalize().multiplyScalar(speed);
      const maxStepHeight = 0.5;

      const nextX = posRef.current.x + direction.x;
      if (canFitAt(nextX, posRef.current.y, posRef.current.z)) {
        posRef.current.x = nextX;
      } else if (
        isGrounded &&
        canFitAt(nextX, posRef.current.y + maxStepHeight, posRef.current.z)
      ) {
        posRef.current.x = nextX;
        posRef.current.y += maxStepHeight;
      }

      const nextZ = posRef.current.z + direction.z;
      if (canFitAt(posRef.current.x, posRef.current.y, nextZ)) {
        posRef.current.z = nextZ;
      } else if (
        isGrounded &&
        canFitAt(posRef.current.x, posRef.current.y + maxStepHeight, nextZ)
      ) {
        posRef.current.z = nextZ;
        posRef.current.y += maxStepHeight;
      }
    }

    const worldBoundaryRadius = 0.75;
    const minBoundary = -0.75 + worldBoundaryRadius;
    const maxBoundary = mapSize * BLOCK_SIZE - 0.75 - worldBoundaryRadius;

    if (posRef.current.x < minBoundary) posRef.current.x = minBoundary;
    if (posRef.current.x > maxBoundary) posRef.current.x = maxBoundary;
    if (posRef.current.z < minBoundary) posRef.current.z = minBoundary;
    if (posRef.current.z > maxBoundary) posRef.current.z = maxBoundary;

    let nextVelocityY = velocityY.current - 65 * dt;
    if (nextVelocityY < -50) nextVelocityY = -50;

    let nextY = posRef.current.y + nextVelocityY * dt;

    const groundAfterMove = getGroundYAt(
      posRef.current.x,
      posRef.current.z,
      posRef.current.y,
    );

    if (nextVelocityY <= 0 && nextY <= groundAfterMove + 0.05) {
      nextY = groundAfterMove;
      nextVelocityY = 0;

      // ИСПРАВЛЕНИЕ: Добавили прыжок с мобилки
      if (keys["Space"] || mobileControls.jump) {
        nextVelocityY = 15;
        nextY += 0.05;
      }
    } else if (
      nextVelocityY > 0 &&
      !canFitAt(posRef.current.x, nextY, posRef.current.z)
    ) {
      nextVelocityY = 0;
    }

    velocityY.current = nextVelocityY;
    posRef.current.y = nextY;

    if (posRef.current.y < -25) {
      window.location.reload();
    }

    const currentChunkX = Math.floor(
      posRef.current.x / (chunkSize * BLOCK_SIZE),
    );
    const currentChunkZ = Math.floor(
      posRef.current.z / (chunkSize * BLOCK_SIZE),
    );

    if (
      currentChunkX !== lastChunk.current.x ||
      currentChunkZ !== lastChunk.current.z
    ) {
      lastChunk.current = { x: currentChunkX, z: currentChunkZ };
      onChunkChange(currentChunkX, currentChunkZ);
    }
  };

  return { updatePhysics };
}
