// src/utils/chunkWorkerManager.ts

// Определяем количество доступных ядер процессора (оставляем 1 ядро для самой игры)
const hardwareThreads = navigator.hardwareConcurrency || 4;
const NUM_WORKERS = Math.max(1, hardwareThreads - 1);

// Создаем ПУЛ воркеров
const workers: Worker[] = [];
for (let i = 0; i < NUM_WORKERS; i++) {
  workers.push(
    new Worker(
      new URL("../components/Chunk/chunk.worker.ts", import.meta.url),
      {
        type: "module",
      },
    ),
  );
}

let nextWorkerIndex = 0;
type ChunkCallback = (data: any) => void;
const listeners = new Map<string, ChunkCallback>();

// Назначаем обработчик ответов всем воркерам
const handleMessage = (e: MessageEvent) => {
  if (!e.data || typeof e.data !== "object" || e.data.type === "vite-hmr")
    return;
  const key = `${e.data.chunkX},${e.data.chunkZ}`;
  const callback = listeners.get(key);
  if (callback) {
    callback(e.data);
  }
};

workers.forEach((worker) => {
  worker.onmessage = handleMessage;
});

export const requestChunkData = (
  chunkX: number,
  chunkZ: number,
  chunkSize: number,
  seed: string | undefined,
  modifiedBlocksBuffer: Int32Array,
  onData: ChunkCallback,
) => {
  const key = `${chunkX},${chunkZ}`;
  listeners.set(key, onData);

  // Берем следующего свободного воркера по кругу (Round-Robin)
  const worker = workers[nextWorkerIndex];
  nextWorkerIndex = (nextWorkerIndex + 1) % NUM_WORKERS;

  worker.postMessage({
    chunkX,
    chunkZ,
    chunkSize,
    seed,
    modifiedBlocksBuffer,
  });
};

export const removeChunkListener = (chunkX: number, chunkZ: number) => {
  const key = `${chunkX},${chunkZ}`;
  listeners.delete(key);
};
