// import { useRef, useEffect } from "react";
// import { supabase } from "../utils/supabase";
// import type { World } from "../components/UI/MainMenu/types";

// // Добавляем modifiedBlocks в аргументы
// export const useWorldSave = (
//   currentWorld: World | null,
//   modifiedBlocks: Set<string>,
// ) => {
//   const currentWorldIdRef = useRef<string | null>(null);
//   const playerPosRef = useRef({ x: 0, y: 25, z: 0 });
//   const timeRef = useRef(0);

//   // Создаем Ref для блоков, чтобы таймер всегда видел их актуальное состояние без перезапуска
//   const modifiedBlocksRef = useRef<Set<string>>(modifiedBlocks);

//   useEffect(() => {
//     modifiedBlocksRef.current = modifiedBlocks;
//   }, [modifiedBlocks]);

//   const saveWorldData = async () => {
//     const worldId = currentWorldIdRef.current;
//     if (!worldId) return;

//     // Превращаем Set обратно в массив для сохранения в JSONB
//     const blocksArray = Array.from(modifiedBlocksRef.current);

//     const { error } = await supabase
//       .from("worlds")
//       .update({
//         player_pos: playerPosRef.current,
//         time_of_day: timeRef.current,
//         modified_blocks: blocksArray, // СОХРАНЯЕМ БЛОКИ
//       })
//       .eq("id", worldId);

//     if (error) {
//       console.error("Ошибка сохранения мира:", error);
//     }
//   };

//   useEffect(() => {
//     if (!currentWorld) return;

//     currentWorldIdRef.current = currentWorld.id; // Обновляем ID текущего мира

//     const saveInterval = setInterval(saveWorldData, 5000);
//     const handleBeforeUnload = () => saveWorldData();

//     window.addEventListener("beforeunload", handleBeforeUnload);

//     return () => {
//       clearInterval(saveInterval);
//       saveWorldData();
//       window.removeEventListener("beforeunload", handleBeforeUnload);
//     };
//   }, [currentWorld]);

//   return { currentWorldIdRef, playerPosRef, timeRef, saveWorldData };
// };
import { useRef, useEffect } from "react";
import { supabase } from "../utils/supabase";
import type { World } from "../components/UI/MainMenu/types";
import { blockStore } from "../store/blockStore";

export const useWorldSave = (currentWorld: World | null) => {
  const currentWorldIdRef = useRef<string | null>(null);
  const playerPosRef = useRef({ x: 0, y: 25, z: 0 });
  const timeRef = useRef(0);

  const saveWorldData = async () => {
    const worldId = currentWorldIdRef.current;
    if (!worldId) return;

    // Читаем напрямую из хранилища без React-state
    const blocksArray = blockStore.getBlocksArray();

    const { error } = await supabase
      .from("worlds")
      .update({
        player_pos: playerPosRef.current,
        time_of_day: timeRef.current,
        modified_blocks: blocksArray,
      })
      .eq("id", worldId);

    if (error) console.error("Ошибка сохранения мира:", error);
  };

  useEffect(() => {
    if (!currentWorld) return;
    currentWorldIdRef.current = currentWorld.id;

    const saveInterval = setInterval(saveWorldData, 5000);
    const handleBeforeUnload = () => saveWorldData();

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(saveInterval);
      saveWorldData();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentWorld]);

  return { currentWorldIdRef, playerPosRef, timeRef, saveWorldData };
};
