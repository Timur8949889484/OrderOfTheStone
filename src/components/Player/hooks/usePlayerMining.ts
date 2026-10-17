import { useRef } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import { crackMaterials } from "../../../utils/materials";
import { getGlobalBlock } from "../../../store/chunkStore";

import { blockStore } from "../../../store/blockStore";
import { IS_MOBILE } from "../../../utils/constants";
import { mobileControls } from "../../../utils/mobileControls";

const BLOCK_SIZE = 1.5;
const MAX_MINING_DISTANCE = 7.5;
const tempVisualTarget = new THREE.Vector3();

interface UsePlayerMiningProps {
  camera: THREE.Camera;
  isMining: React.MutableRefObject<boolean>;
  mineReleaseTime: React.MutableRefObject<number>;
  onBlockBreak?: (x: number, y: number, z: number, blockType?: number) => void;
  onMiningHit?: (x: number, y: number, z: number, blockType?: number) => void;
}

export function usePlayerMining({
  camera,
  isMining,
  mineReleaseTime,
  onBlockBreak,
  onMiningHit,
}: UsePlayerMiningProps) {
  const mineProgress = useRef(0);
  const mineTarget = useRef<THREE.Vector3 | null>(null);
  const particleTimer = useRef(0);
  const recentlyBrokenRef = useRef<Set<string>>(new Set());

  // Воксельный Raycast 3D DDA (в 1000 раз быстрее ThreeJS Raycaster)
  const getVoxelHit = (
    rayOrigin: THREE.Vector3,
    rayDir: THREE.Vector3,
    maxDist: number,
  ) => {
    let x = Math.floor(rayOrigin.x / BLOCK_SIZE + 0.5);
    let y = Math.floor(rayOrigin.y / BLOCK_SIZE + 1.0);
    let z = Math.floor(rayOrigin.z / BLOCK_SIZE + 0.5);

    const stepX = Math.sign(rayDir.x);
    const stepY = Math.sign(rayDir.y);
    const stepZ = Math.sign(rayDir.z);

    const voxelEdgeX =
      stepX > 0 ? (x + 0.5) * BLOCK_SIZE : (x - 0.5) * BLOCK_SIZE;
    const voxelEdgeY = stepY > 0 ? y * BLOCK_SIZE : (y - 1) * BLOCK_SIZE;
    const voxelEdgeZ =
      stepZ > 0 ? (z + 0.5) * BLOCK_SIZE : (z - 0.5) * BLOCK_SIZE;

    let tMaxX = stepX !== 0 ? (voxelEdgeX - rayOrigin.x) / rayDir.x : Infinity;
    let tMaxY = stepY !== 0 ? (voxelEdgeY - rayOrigin.y) / rayDir.y : Infinity;
    let tMaxZ = stepZ !== 0 ? (voxelEdgeZ - rayOrigin.z) / rayDir.z : Infinity;

    const tDeltaX = stepX !== 0 ? BLOCK_SIZE / Math.abs(rayDir.x) : Infinity;
    const tDeltaY = stepY !== 0 ? BLOCK_SIZE / Math.abs(rayDir.y) : Infinity;
    const tDeltaZ = stepZ !== 0 ? BLOCK_SIZE / Math.abs(rayDir.z) : Infinity;

    let hitDistance = 0;
    let normal = new THREE.Vector3();

    for (let i = 0; i < 20; i++) {
      if (hitDistance > maxDist) break;

      // const bType = getBlockType(x, y, z);
      const bType = getGlobalBlock(x, y, z);
      const isBroken = blockStore.isBlockBroken(x, y, z);
      const isRecentlyBroken = recentlyBrokenRef.current.has(`${x},${y},${z}`);

      if (bType !== 0 && !isBroken && !isRecentlyBroken) {
        return { x, y, z, normal, distance: hitDistance, blockType: bType };
      }

      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        hitDistance = tMaxX;
        x += stepX;
        tMaxX += tDeltaX;
        normal.set(-stepX, 0, 0);
      } else if (tMaxY < tMaxZ) {
        hitDistance = tMaxY;
        y += stepY;
        tMaxY += tDeltaY;
        normal.set(0, -stepY, 0);
      } else {
        hitDistance = tMaxZ;
        z += stepZ;
        tMaxZ += tDeltaZ;
        normal.set(0, 0, -stepZ);
      }
    }
    return null;
  };

  const updateMining = (
    dt: number,
    now: number,
    crackMeshRef: RefObject<THREE.Mesh>,
  ) => {
    const rayDir = new THREE.Vector3();

    // === ИСПРАВЛЕНИЕ: ОТКУДА СТРЕЛЯТЬ ЛУЧОМ? ===
    if (IS_MOBILE && mobileControls.mineCoords) {
      // Переводим 2D координаты пальца в 3D направление
      const mouse = new THREE.Vector2(
        (mobileControls.mineCoords.x / window.innerWidth) * 2 - 1,
        -(mobileControls.mineCoords.y / window.innerHeight) * 2 + 1,
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      rayDir.copy(raycaster.ray.direction);
    } else {
      // На ПК стреляем из центра экрана
      camera.getWorldDirection(rayDir);
    }
    rayDir.normalize();

    // === ИСПРАВЛЕНИЕ: ЧЬЁ СОСТОЯНИЕ ЧИТАТЬ? ===
    const isMiningNow = IS_MOBILE ? mobileControls.isMining : isMining.current;
    const releaseTimeNow = IS_MOBILE
      ? mobileControls.mineReleaseTime
      : mineReleaseTime.current;

    const hit = getVoxelHit(camera.position, rayDir, MAX_MINING_DISTANCE);

    if (hit) {
      tempVisualTarget.set(
        hit.x * BLOCK_SIZE,
        (hit.y - 0.5) * BLOCK_SIZE,
        hit.z * BLOCK_SIZE,
      );

      if (isMiningNow) {
        if (
          !mineTarget.current ||
          !mineTarget.current.equals(tempVisualTarget)
        ) {
          mineTarget.current = tempVisualTarget.clone();
          mineProgress.current = 0;
          particleTimer.current = 0;
        }

        mineProgress.current += dt;
        particleTimer.current += dt;

        if (particleTimer.current >= 0.15) {
          if (onMiningHit) {
            onMiningHit(hit.x, hit.y, hit.z, hit.blockType);
          }
          particleTimer.current = 0;
        }

        if (mineProgress.current >= 1) {
          const key = `${hit.x},${hit.y},${hit.z}`;
          recentlyBrokenRef.current.add(key);
          setTimeout(() => recentlyBrokenRef.current.delete(key), 600);

          if (onBlockBreak) onBlockBreak(hit.x, hit.y, hit.z, hit.blockType);

          mineProgress.current = 0;
          particleTimer.current = 0;
          mineTarget.current = null;
        }
      }
    } else {
      if (isMiningNow) {
        mineTarget.current = null;
        mineProgress.current = 0;
        particleTimer.current = 0;
      }
    }

    // ИСПРАВЛЕНИЕ: Заменяем mineReleaseTime.current на releaseTimeNow
    if (!isMiningNow && mineProgress.current > 0) {
      if (now - releaseTimeNow > 500) {
        mineProgress.current = 0;
        mineTarget.current = null;
      }
    }

    if (crackMeshRef.current) {
      if (mineProgress.current > 0 && mineTarget.current) {
        crackMeshRef.current.visible = true;
        crackMeshRef.current.position.copy(mineTarget.current);
        const stage = Math.min(9, Math.floor(mineProgress.current * 10));
        crackMeshRef.current.material = crackMaterials[stage];
      } else {
        crackMeshRef.current.visible = false;
      }
    }
  };

  return { updateMining };
}
