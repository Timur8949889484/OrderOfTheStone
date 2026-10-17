const BLOCK_SIZE = 1.5;

type Listener = (x: number, y: number, z: number) => void;

class BlockStore {
  private blocks = new Set<string>();
  private listeners = new Set<Listener>();

  // Кэш для бинарного массива (чтобы не создавать его заново для каждого из 900 чанков)
  private cachedBuffer: Int32Array | null = null;

  init(initialBlocks?: string[]) {
    this.blocks = new Set(initialBlocks || []);
    this.cachedBuffer = null; // Сбрасываем кэш при загрузке мира
  }

  breakBlock(x: number, y: number, z: number) {
    const gx = Math.round(x);
    const gy = Math.round(y);
    const gz = Math.round(z);

    const key = `${gx},${gy},${gz}`;

    if (!this.blocks.has(key)) {
      this.blocks.add(key);
      this.cachedBuffer = null; // Инвалидируем кэш, так как блоки изменились
      this.notify(gx, gy, gz);
    }
  }

  isBlockBroken(gx: number, gy: number, gz: number): boolean {
    return this.blocks.has(`${gx},${gy},${gz}`);
  }

  getBlocksArray(): string[] {
    return Array.from(this.blocks); // Нужно только для сохранения в БД
  }

  // НОВАЯ ФУНКЦИЯ: Превращает Set строк в супер-быстрый массив чисел [x1,y1,z1, x2,y2,z2...]
  getBlocksBuffer(): Int32Array {
    if (this.cachedBuffer) return this.cachedBuffer;

    const arr = new Int32Array(this.blocks.size * 3);
    let i = 0;
    for (const key of this.blocks) {
      const comma1 = key.indexOf(",");
      const comma2 = key.indexOf(",", comma1 + 1);
      arr[i++] = parseInt(key.substring(0, comma1), 10);
      arr[i++] = parseInt(key.substring(comma1 + 1, comma2), 10);
      arr[i++] = parseInt(key.substring(comma2 + 1), 10);
    }

    this.cachedBuffer = arr;
    return arr;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(x: number, y: number, z: number) {
    this.listeners.forEach((l) => l(x, y, z));
  }
}

export const blockStore = new BlockStore();
