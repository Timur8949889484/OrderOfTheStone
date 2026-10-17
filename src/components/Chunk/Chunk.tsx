// import React, { useRef, useEffect } from "react";
// import * as THREE from "three";
// import { atlasMaterial } from "../../utils/materials";
// import {
//   requestChunkData,
//   removeChunkListener,
// } from "../../utils/chunkWorkerManager";
// import { blockStore } from "../../store/blockStore";
// import { chunkDataStore } from "../../store/chunkStore";

// interface ChunkProps {
//   chunkX: number;
//   chunkZ: number;
//   chunkSize: number;
//   seed?: string;
// }

// export const Chunk = React.memo(
//   ({ chunkX, chunkZ, chunkSize, seed = "default_seed" }: ChunkProps) => {
//     const meshRef = useRef<THREE.Mesh>(null);

//     useEffect(() => {
//       const handleChunkData = (data: any) => {
//         // СОХРАНЯЕМ КАРТУ БЛОКОВ
//         if (data.blockTypeMap) {
//           chunkDataStore.set(
//             `${chunkX},${chunkZ}`,
//             new Uint8Array(data.blockTypeMap),
//           );
//         }

//         const mesh = meshRef.current;
//         if (!mesh) return;

//         // Воркер теперь возвращает данные в data.geometry
//         const bufferData = data.geometry;
//         if (!bufferData || bufferData.pos.byteLength === 0) {
//           mesh.visible = false;
//           window.dispatchEvent(
//             new CustomEvent("chunk-loaded", {
//               detail: { x: chunkX, z: chunkZ },
//             }),
//           );
//           return;
//         }

//         const { pos, norm, uv, col, ind } = bufferData;

//         const geo = new THREE.BufferGeometry();
//         geo.setAttribute(
//           "position",
//           new THREE.BufferAttribute(new Float32Array(pos), 3),
//         );
//         geo.setAttribute(
//           "normal",
//           new THREE.BufferAttribute(new Float32Array(norm), 3),
//         );
//         geo.setAttribute(
//           "uv",
//           new THREE.BufferAttribute(new Float32Array(uv), 2),
//         );
//         geo.setAttribute(
//           "color",
//           new THREE.BufferAttribute(new Float32Array(col), 3),
//         );

//         // БЫЛО: geo.setIndex(new THREE.BufferAttribute(new Uint16Array(bufferData.ind), 1));
//         geo.setIndex(
//           new THREE.BufferAttribute(new Uint32Array(bufferData.ind), 1),
//         ); // <--- СТАТЬ ДОЛЖНО ТАК

//         // Точный математический Bounding Box
//         const BLOCK_SIZE = 1.5;
//         const minX = chunkX * chunkSize * BLOCK_SIZE;
//         const minZ = chunkZ * chunkSize * BLOCK_SIZE;
//         const maxX = (chunkX + 1) * chunkSize * BLOCK_SIZE;
//         const maxZ = (chunkZ + 1) * chunkSize * BLOCK_SIZE;
//         const minY = -32 * BLOCK_SIZE; // С запасом вниз
//         const maxY = 129 * BLOCK_SIZE; // С запасом вверх

//         geo.boundingBox = new THREE.Box3(
//           new THREE.Vector3(minX, minY, minZ),
//           new THREE.Vector3(maxX, maxY, maxZ),
//         );
//         geo.boundingSphere = new THREE.Sphere();
//         geo.boundingBox.getBoundingSphere(geo.boundingSphere);

//         if (mesh.geometry) mesh.geometry.dispose();
//         mesh.geometry = geo;
//         mesh.visible = true;

//         window.dispatchEvent(
//           new CustomEvent("chunk-loaded", { detail: { x: chunkX, z: chunkZ } }),
//         );
//       };

//       const fetchChunk = () => {
//         requestChunkData(
//           chunkX,
//           chunkZ,
//           chunkSize,
//           seed,
//           blockStore.getBlocksBuffer(),
//           handleChunkData,
//         );
//       };

//       fetchChunk();

//       const unsubscribe = blockStore.subscribe((bx, _by, bz) => {
//         const minX = chunkX * chunkSize - 2;
//         const maxX = (chunkX + 1) * chunkSize + 1;
//         const minZ = chunkZ * chunkSize - 2;
//         const maxZ = (chunkZ + 1) * chunkSize + 1;

//         if (bx >= minX && bx <= maxX && bz >= minZ && bz <= maxZ) {
//           fetchChunk();
//         }
//       });

//       return () => {
//         unsubscribe();
//         removeChunkListener(chunkX, chunkZ);
//         if (meshRef.current?.geometry) {
//           meshRef.current.geometry.dispose();
//         }
//       };
//     }, [chunkX, chunkZ, chunkSize, seed]);

//     return (
//       <mesh
//         ref={meshRef}
//         material={atlasMaterial} // ИСПОЛЬЗУЕМ НОВЫЙ АТЛАС
//         frustumCulled={true}
//       />
//     );
//   },
// );
