// import { useState, useCallback, useEffect, useRef } from "react";

// const BLOCK_SIZE = 1.5;

// export const useBlockManager = (initialBlocks?: string[]) => {
//   const [modifiedBlocks, setModifiedBlocks] = useState<Set<string>>(
//     () => new Set(initialBlocks || []),
//   );

//   const prevInitialRef = useRef<string[] | undefined>(initialBlocks);

//   useEffect(() => {
//     if (initialBlocks !== prevInitialRef.current) {
//       prevInitialRef.current = initialBlocks;
//       setModifiedBlocks(new Set(initialBlocks || []));
//     }
//   }, [initialBlocks]);

//   const handleBlockBreak = useCallback((x: number, y: number, z: number) => {
//     // 1. Прямые целые ключи (так как из usePlayerMining приходят индексы сетки: 10, 5, 12)
//     const directX = Math.round(x);
//     const directY = Math.round(y);
//     const directZ = Math.round(z);

//     // 2. Вариант, если координаты пришли в мировых единицах (15.0, 7.5, 18.0)
//     const gridFromWorldX = Math.round(x / BLOCK_SIZE);
//     const gridFromWorldY = Math.round(y / BLOCK_SIZE);
//     const gridFromWorldZ = Math.round(z / BLOCK_SIZE);

//     // 3. Мировые координаты
//     const worldX = Math.round(x * BLOCK_SIZE);
//     const worldY = Math.round(y * BLOCK_SIZE);
//     const worldZ = Math.round(z * BLOCK_SIZE);

//     // Генерируем варианты ключей под любые проверки в физике и воркере
//     const keysToAdd = [
//       `${directX},${directY},${directZ}`,
//       `${gridFromWorldX},${gridFromWorldY},${gridFromWorldZ}`,
//       `${worldX},${worldY},${worldZ}`,
//     ];

//     setModifiedBlocks((prev) => {
//       let hasNew = false;
//       for (const k of keysToAdd) {
//         if (!prev.has(k)) {
//           hasNew = true;
//           break;
//         }
//       }
//       if (!hasNew) return prev;

//       const next = new Set(prev);
//       keysToAdd.forEach((k) => next.add(k));
//       return next;
//     });
//   }, []);

//   return { modifiedBlocks, handleBlockBreak };
// };
import { useCallback, useEffect } from "react";
import { blockStore } from "../store/blockStore";

export const useBlockManager = (initialBlocks?: string[]) => {
  useEffect(() => {
    blockStore.init(initialBlocks);
  }, [initialBlocks]);

  const handleBlockBreak = useCallback((x: number, y: number, z: number) => {
    blockStore.breakBlock(x, y, z);
  }, []);

  return { handleBlockBreak };
};
