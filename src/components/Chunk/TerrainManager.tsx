import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { atlasMaterial } from "../../utils/materials";
import {
  requestChunkData,
  removeChunkListener,
} from "../../utils/chunkWorkerManager";
import { blockStore } from "../../store/blockStore";
import { chunkDataStore } from "../../store/chunkStore";
import { CHUNK_SIZE, RENDER_DISTANCE } from "../../utils/constants";

interface TerrainManagerProps {
  seed?: string;
  playerChunkX: number;
  playerChunkZ: number;
  isGenerating: boolean;
}

export const TerrainManager = React.memo(
  ({ seed, playerChunkX, playerChunkZ, isGenerating }: TerrainManagerProps) => {
    const terrainGroup = useRef<THREE.Group>(null);
    const activeChunks = useRef(new Map<string, THREE.Group>());
    const queuedChunks = useRef(new Set<string>());

    const handleChunkData = (chunkX: number, chunkZ: number, data: any) => {
      if (!terrainGroup.current) return;
      const key = `${chunkX},${chunkZ}`;

      if (data.blockTypeMap) {
        chunkDataStore.set(key, new Uint8Array(data.blockTypeMap));
      }

      let chunkGroup = activeChunks.current.get(key);
      if (!chunkGroup) {
        chunkGroup = new THREE.Group();
        chunkGroup.name = `chunk_${key}`;
        terrainGroup.current.add(chunkGroup);
        activeChunks.current.set(key, chunkGroup);
      } else {
        chunkGroup.children.forEach((child) => {
          if ((child as THREE.Mesh).geometry)
            (child as THREE.Mesh).geometry.dispose();
        });
        chunkGroup.clear();
      }

      // БОЛЬШЕ НЕТ ЦИКЛА forEach! Воркер присылает один готовый буфер под Атлас.
      const bufferData = data.geometry;
      if (!bufferData || bufferData.pos.byteLength === 0) {
        window.dispatchEvent(
          new CustomEvent("chunk-loaded", { detail: { x: chunkX, z: chunkZ } }),
        );
        return;
      }

      const BLOCK_SIZE = 1.5;
      const minX = chunkX * CHUNK_SIZE * BLOCK_SIZE;
      const minZ = chunkZ * CHUNK_SIZE * BLOCK_SIZE;
      const maxX = (chunkX + 1) * CHUNK_SIZE * BLOCK_SIZE;
      const maxZ = (chunkZ + 1) * CHUNK_SIZE * BLOCK_SIZE;
      const minY = -32 * BLOCK_SIZE;
      const maxY = 129 * BLOCK_SIZE;

      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(bufferData.pos), 3),
      );
      geo.setAttribute(
        "normal",
        new THREE.BufferAttribute(new Float32Array(bufferData.norm), 3),
      );
      geo.setAttribute(
        "uv",
        new THREE.BufferAttribute(new Float32Array(bufferData.uv), 2),
      );
      geo.setAttribute(
        "color",
        new THREE.BufferAttribute(new Float32Array(bufferData.col), 3),
      );

      // Используем Uint32Array, чтобы гигантские деревья не ломали геометрию
      geo.setIndex(
        new THREE.BufferAttribute(new Uint32Array(bufferData.ind), 1),
      );

      geo.boundingBox = new THREE.Box3(
        new THREE.Vector3(minX, minY, minZ),
        new THREE.Vector3(maxX, maxY, maxZ),
      );
      geo.boundingSphere = new THREE.Sphere();
      geo.boundingBox.getBoundingSphere(geo.boundingSphere);

      // ВСЕГО 1 MESH НА ВЕСЬ ЧАНК!
      const mesh = new THREE.Mesh(geo, atlasMaterial);
      mesh.frustumCulled = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();

      chunkGroup.add(mesh);

      window.dispatchEvent(
        new CustomEvent("chunk-loaded", { detail: { x: chunkX, z: chunkZ } }),
      );
    };

    useEffect(() => {
      if (!isGenerating || !terrainGroup.current) return;

      const requiredChunks = new Set<string>();
      for (
        let x = playerChunkX - RENDER_DISTANCE - 1;
        x <= playerChunkX + RENDER_DISTANCE + 1;
        x++
      ) {
        for (
          let z = playerChunkZ - RENDER_DISTANCE - 1;
          z <= playerChunkZ + RENDER_DISTANCE + 1;
          z++
        ) {
          requiredChunks.add(`${x},${z}`);
        }
      }

      for (const [key, group] of activeChunks.current.entries()) {
        if (!requiredChunks.has(key)) {
          terrainGroup.current.remove(group);
          group.children.forEach((child) => {
            if ((child as THREE.Mesh).geometry)
              (child as THREE.Mesh).geometry.dispose();
          });
          activeChunks.current.delete(key);
          removeChunkListener(
            parseInt(key.split(",")[0]),
            parseInt(key.split(",")[1]),
          );
        }
      }

      const missing = [];
      for (const key of requiredChunks) {
        if (!activeChunks.current.has(key) && !queuedChunks.current.has(key)) {
          const [cx, cz] = key.split(",").map(Number);
          const dist = (cx - playerChunkX) ** 2 + (cz - playerChunkZ) ** 2;
          missing.push({ key, cx, cz, dist });
        }
      }
      missing.sort((a, b) => a.dist - b.dist);
      missing.forEach((m) => queuedChunks.current.add(m.key));
    }, [playerChunkX, playerChunkZ, isGenerating, seed]);

    useEffect(() => {
      if (!isGenerating) return;
      const interval = setInterval(() => {
        if (queuedChunks.current.size === 0) return;

        const batch = Array.from(queuedChunks.current).slice(0, 15);
        batch.forEach((key) => {
          queuedChunks.current.delete(key);
          const [cx, cz] = key.split(",").map(Number);
          requestChunkData(
            cx,
            cz,
            CHUNK_SIZE,
            seed,
            blockStore.getBlocksBuffer(),
            (data) => handleChunkData(cx, cz, data),
          );
        });
      }, 50);

      return () => clearInterval(interval);
    }, [isGenerating, seed]);

    useEffect(() => {
      const unsubscribe = blockStore.subscribe((bx, _by, bz) => {
        const MIN_X = bx - 2;
        const MAX_X = bx + 2;
        const MIN_Z = bz - 2;
        const MAX_Z = bz + 2;

        for (const [key] of activeChunks.current.entries()) {
          const [cx, cz] = key.split(",").map(Number);
          const cMinX = cx * CHUNK_SIZE;
          const cMaxX = (cx + 1) * CHUNK_SIZE;
          const cMinZ = cz * CHUNK_SIZE;
          const cMaxZ = (cz + 1) * CHUNK_SIZE;

          if (
            MAX_X >= cMinX &&
            MIN_X <= cMaxX &&
            MAX_Z >= cMinZ &&
            MIN_Z <= cMaxZ
          ) {
            requestChunkData(
              cx,
              cz,
              CHUNK_SIZE,
              seed,
              blockStore.getBlocksBuffer(),
              (data) => handleChunkData(cx, cz, data),
            );
          }
        }
      });

      return () => {
        unsubscribe(); // Твой фикс для TypeScript
      };
    }, [seed]);

    // В файле src/components/Chunk/TerrainManager.tsx (в самом низу компонента, перед return)

    // ИСПРАВЛЕНИЕ: Очищаем старые чанки при выходе в меню (когда isGenerating становится false)
    useEffect(() => {
      if (!isGenerating) {
        activeChunks.current.forEach((group, key) => {
          if (terrainGroup.current) {
            terrainGroup.current.remove(group);
          }
          group.children.forEach((child) =>
            (child as THREE.Mesh).geometry?.dispose(),
          );

          // Удаляем слушатели, чтобы старые ответы воркера не ломали новую загрузку
          const [cx, cz] = key.split(",").map(Number);
          removeChunkListener(cx, cz);
        });

        activeChunks.current.clear();
        queuedChunks.current.clear();
        chunkDataStore.clear(); // Очищаем кэш невидимых блоков (коллизий)
      }
    }, [isGenerating]);

    // Оставляем очистку при полном размонтировании (на всякий случай)
    useEffect(() => {
      return () => {
        activeChunks.current.forEach((group) => {
          group.children.forEach((child) =>
            (child as THREE.Mesh).geometry?.dispose(),
          );
        });
        activeChunks.current.clear();
        queuedChunks.current.clear();
      };
    }, []);

    return <group ref={terrainGroup} name="terrain" />;
  },
);
