// import { useState, useEffect, useRef, useCallback } from "react";
// import { RENDER_DISTANCE } from "./constants";

// export function useChunkManager(
//   startChunkX: number,
//   startChunkZ: number,
//   isGenerating: boolean,
//   worldId?: string | null,
// ) {
//   const [visibleChunks, setVisibleChunks] = useState<
//     { x: number; z: number }[]
//   >([]);
//   const [progress, setProgress] = useState(0);
//   const [isReady, setIsReady] = useState(false);
//   const [stage, setStage] = useState<"generating" | "baking" | "ready">(
//     "generating",
//   );

//   const [prevWorldId, setPrevWorldId] = useState<string | null | undefined>(
//     worldId,
//   );

//   const targetChunksRef = useRef<Set<string>>(new Set());
//   const currentChunksRef = useRef<{ x: number; z: number }[]>([]);
//   const loadedChunksRef = useRef<Set<string>>(new Set());
//   const playerPosRef = useRef({ x: startChunkX, z: startChunkZ });

//   // Функция, которая мгновенно пересчитывает, какие чанки нужны
//   const updateTargetChunks = useCallback((px: number, pz: number) => {
//     const radius = RENDER_DISTANCE || 15;
//     const newTargets = new Set<string>();
//     // Чтобы чанки не мигали на границе тумана, сохраняем чанки чуть дальше (+1)
//     for (let cx = px - radius - 1; cx <= px + radius + 1; cx++) {
//       for (let cz = pz - radius - 1; cz <= pz + radius + 1; cz++) {
//         newTargets.add(`${cx},${cz}`);
//       }
//     }
//     targetChunksRef.current = newTargets;
//   }, []);

//   // Сброс при смене мира
//   if (worldId !== prevWorldId) {
//     setPrevWorldId(worldId);
//     setVisibleChunks([]);
//     currentChunksRef.current = [];
//     loadedChunksRef.current.clear();
//     playerPosRef.current = { x: startChunkX, z: startChunkZ };
//     setProgress(0);
//     setIsReady(false);
//     setStage("generating");
//     updateTargetChunks(startChunkX, startChunkZ);
//   }

//   // Запуск расчета при генерации мира
//   useEffect(() => {
//     if (worldId && isGenerating) {
//       updateTargetChunks(startChunkX, startChunkZ);
//     }
//   }, [worldId, isGenerating, startChunkX, startChunkZ, updateTargetChunks]);

//   // Слушаем РЕАЛЬНЫЕ ответы от воркеров для меню
//   useEffect(() => {
//     if (!worldId || !isGenerating || isReady) return;

//     const handleChunkLoaded = (e: Event) => {
//       const { detail } = e as CustomEvent;
//       if (detail.x !== undefined) {
//         loadedChunksRef.current.add(`${detail.x},${detail.z}`);

//         if (stage === "generating") {
//           // Высчитываем реальное количество нужных чанков для радиуса
//           const radius = RENDER_DISTANCE || 15;
//           const totalTargets = (radius * 2 + 1) * (radius * 2 + 1);

//           const pct = Math.floor(
//             (loadedChunksRef.current.size / totalTargets) * 90,
//           );
//           setProgress(Math.min(pct, 90));

//           if (loadedChunksRef.current.size >= totalTargets) {
//             setStage("baking");
//             window.dispatchEvent(new CustomEvent("gpu-compile"));
//           }
//         }
//       }
//     };

//     window.addEventListener("chunk-loaded", handleChunkLoaded);
//     return () => window.removeEventListener("chunk-loaded", handleChunkLoaded);
//   }, [worldId, isGenerating, isReady, stage]);

//   // Плавный цикл добавления/удаления (работает в фоне)
//   // Плавный цикл добавления/удаления (работает в фоне)
//   useEffect(() => {
//     if (!worldId || !isGenerating) return;

//     const interval = setInterval(() => {
//       const targets = targetChunksRef.current;
//       let current = [...currentChunksRef.current];
//       let changed = false;

//       // Удаляем старые чанки более агрессивно (до 20 за раз) чтобы быстрее очищать память
//       let removedCount = 0;
//       for (let i = current.length - 1; i >= 0; i--) {
//         if (!targets.has(`${current[i].x},${current[i].z}`)) {
//           current.splice(i, 1);
//           changed = true;
//           removedCount++;
//           if (removedCount >= 20) break;
//         }
//       }

//       // Добавляем новые
//       const currentKeys = new Set(current.map((c) => `${c.x},${c.z}`));
//       const missing = [];
//       const px = playerPosRef.current.x;
//       const pz = playerPosRef.current.z;

//       for (const key of targets) {
//         if (!currentKeys.has(key)) {
//           const [x, z] = key.split(",").map(Number);
//           missing.push({ x, z, dist: (x - px) ** 2 + (z - pz) ** 2 });
//         }
//       }

//       // ИСПРАВЛЕНИЕ: Мы добавляем чанки БОЛЬШИМИ пачками (до 30),
//       // чтобы сократить количество React-рендеров. Меньше рендеров = больше FPS.
//       if (missing.length > 0 && removedCount === 0) {
//         missing.sort((a, b) => a.dist - b.dist);
//         const batchSize = isReady ? 30 : 50;
//         for (let i = 0; i < Math.min(batchSize, missing.length); i++) {
//           current.push({ x: missing[i].x, z: missing[i].z });
//           changed = true;
//         }
//       }

//       // Обновляем React-состояние только если действительно что-то поменялось
//       if (changed) {
//         currentChunksRef.current = current;
//         setVisibleChunks(current);
//       }
//     }, 150); // ИСПРАВЛЕНИЕ: Интервал увеличен с 50мс до 150мс. Слишком частый setState убивал FPS!

//     return () => clearInterval(interval);
//   }, [worldId, isGenerating, isReady]);

//   // Ждем GPU
//   useEffect(() => {
//     const handleGpuComplete = () => {
//       if (stage === "baking") {
//         setProgress(100);
//         setStage("ready");
//         setIsReady(true);
//       }
//     };
//     window.addEventListener("gpu-compile-complete", handleGpuComplete);
//     return () =>
//       window.removeEventListener("gpu-compile-complete", handleGpuComplete);
//   }, [stage]);

//   // ИСПРАВЛЕНИЕ: Мгновенно обновляем цели при переходе границы чанка
//   const handleChunkChange = useCallback(
//     (chunkX: number, chunkZ: number) => {
//       if (!isReady) return;
//       playerPosRef.current = { x: chunkX, z: chunkZ };
//       updateTargetChunks(chunkX, chunkZ); // Воркеры сразу начинают работу!
//     },
//     [isReady, updateTargetChunks],
//   );

//   return { visibleChunks, handleChunkChange, progress, isReady, stage };
// }
import { useState, useEffect, useRef, useCallback } from "react";
import { RENDER_DISTANCE } from "./constants";

export function useChunkManager(
  startChunkX: number,
  startChunkZ: number,
  isGenerating: boolean,
  worldId?: string | null,
) {
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [stage, setStage] = useState<"generating" | "baking" | "ready">(
    "generating",
  );

  const [currentChunkX, setCurrentChunkX] = useState(startChunkX);
  const [currentChunkZ, setCurrentChunkZ] = useState(startChunkZ);
  const [prevWorldId, setPrevWorldId] = useState<string | null | undefined>(
    worldId,
  );

  const loadedChunksRef = useRef<Set<string>>(new Set());

  if (worldId !== prevWorldId) {
    setPrevWorldId(worldId);
    loadedChunksRef.current.clear();
    setCurrentChunkX(startChunkX);
    setCurrentChunkZ(startChunkZ);
    setProgress(0);
    setIsReady(false);
    setStage("generating");
  }

  useEffect(() => {
    if (!worldId || !isGenerating || isReady) return;

    const handleChunkLoaded = (e: Event) => {
      const { detail } = e as CustomEvent;
      if (detail.x !== undefined) {
        loadedChunksRef.current.add(`${detail.x},${detail.z}`);

        if (stage === "generating") {
          const radius = RENDER_DISTANCE;
          const totalTargets = (radius * 2 + 1) * (radius * 2 + 1);

          const pct = Math.floor(
            (loadedChunksRef.current.size / totalTargets) * 90,
          );
          setProgress(Math.min(pct, 90));

          if (loadedChunksRef.current.size >= totalTargets) {
            setStage("baking");
            window.dispatchEvent(new CustomEvent("gpu-compile"));
          }
        }
      }
    };

    window.addEventListener("chunk-loaded", handleChunkLoaded);
    return () => window.removeEventListener("chunk-loaded", handleChunkLoaded);
  }, [worldId, isGenerating, isReady, stage]);

  useEffect(() => {
    const handleGpuComplete = () => {
      if (stage === "baking") {
        setProgress(100);
        setStage("ready");
        setIsReady(true);
      }
    };
    window.addEventListener("gpu-compile-complete", handleGpuComplete);
    return () =>
      window.removeEventListener("gpu-compile-complete", handleGpuComplete);
  }, [stage]);

  const handleChunkChange = useCallback(
    (chunkX: number, chunkZ: number) => {
      if (!isReady) return;
      setCurrentChunkX(chunkX);
      setCurrentChunkZ(chunkZ);
    },
    [isReady],
  );

  return {
    handleChunkChange,
    progress,
    isReady,
    stage,
    currentChunkX,
    currentChunkZ,
  };
}
