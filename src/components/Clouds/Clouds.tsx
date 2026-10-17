import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CloudsProps {
  mapSize: number;
  isPaused: boolean;
}

const BLOCK_SIZE = 14;
const GRID_SIZE = 40; // Размер сетки
const CLOUD_RANGE = GRID_SIZE * BLOCK_SIZE;
const HALF_RANGE = CLOUD_RANGE / 2;

// Ширина зоны «тумана» на краях (в блоках). За 3 блока до края цвет станет цветом неба
const FADE_ZONE = BLOCK_SIZE * 3;

const CLOUD_VARIATIONS = [
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [0, 2],
    [1, 2],
    [2, 2],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [1, 1],
    [2, 1],
  ],
  [
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    [4, 1],
    [2, 0],
    [3, 0],
  ],
  [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    [1, 2],
    [2, 2],
  ],
];

function pureRandom(seed: number): number {
  const x = Math.sin(seed) * 43758.5453123;
  return x - Math.floor(x);
}

function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

export function Clouds({ isPaused }: CloudsProps) {
  const cloudsMeshRef = useRef<THREE.InstancedMesh>(null);

  const timeRef = useRef(0);
  const CLOUD_HEIGHT = 80;
  const SPEED = 1.0;

  const dummyMatrix = useMemo(() => new THREE.Matrix4(), []);
  const cloudColor = useMemo(() => new THREE.Color("#f4f7fa"), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const cloudBlocks = useMemo(() => {
    const grid = new Set<string>();
    const TOTAL_CLOUDS = 45;

    for (let c = 0; c < TOTAL_CLOUDS; c++) {
      const startX = Math.floor(pureRandom(c * 12.98) * GRID_SIZE);
      const startZ = Math.floor(pureRandom(c * 43.75) * GRID_SIZE);
      const randForm = pureRandom(c * 93.12);

      const varIdx = Math.floor(randForm * CLOUD_VARIATIONS.length);
      const shape = CLOUD_VARIATIONS[varIdx];

      shape.forEach(([ox, oz]) => {
        const x = (startX + ox) % GRID_SIZE;
        const z = (startZ + oz) % GRID_SIZE;
        grid.add(`${x}_${z}`);
      });
    }

    return Array.from(grid).map((key) => {
      const [x, z] = key.split("_").map(Number);
      return {
        initialX: -HALF_RANGE + x * BLOCK_SIZE,
        initialZ: -HALF_RANGE + z * BLOCK_SIZE,
      };
    });
  }, []);

  useFrame((state, delta) => {
    if (!cloudsMeshRef.current) return;

    if (!isPaused) {
      timeRef.current += delta;
    }

    const globalOffset = timeRef.current * SPEED;
    const camX = state.camera.position.x;
    const camZ = state.camera.position.z;

    // Берем текущий цвет неба/фона
    const bg = state.scene.background;
    const skyColor =
      bg instanceof THREE.Color ? bg : new THREE.Color("#87CEEB");

    cloudBlocks.forEach((block, index) => {
      const rawX = block.initialX + globalOffset;

      let dx = (rawX - camX) % CLOUD_RANGE;
      if (dx > HALF_RANGE) dx -= CLOUD_RANGE;
      if (dx < -HALF_RANGE) dx += CLOUD_RANGE;
      const finalX = camX + dx;

      let dz = (block.initialZ - camZ) % CLOUD_RANGE;
      if (dz > HALF_RANGE) dz -= CLOUD_RANGE;
      if (dz < -HALF_RANGE) dz += CLOUD_RANGE;
      const finalZ = camZ + dz;

      // Позиция блока
      dummyMatrix.setPosition(finalX, CLOUD_HEIGHT, finalZ);
      cloudsMeshRef.current!.setMatrixAt(index, dummyMatrix);

      // Расстояние до квадратной границы зоны обзора
      const distToEdge = Math.max(Math.abs(dx), Math.abs(dz));

      // Начинаем плавно сглаживать за FADE_ZONE (3 блока) до края
      const fadeStart = HALF_RANGE - FADE_ZONE;
      const fadeFactor = smoothstep(fadeStart, HALF_RANGE, distToEdge);

      // Смешиваем цвет с небом: у центра — белый, у края — 100% цвет неба
      tempColor.lerpColors(cloudColor, skyColor, fadeFactor);
      cloudsMeshRef.current!.setColorAt(index, tempColor);
    });

    cloudsMeshRef.current.instanceMatrix.needsUpdate = true;
    if (cloudsMeshRef.current.instanceColor) {
      cloudsMeshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={cloudsMeshRef}
      args={[undefined, undefined, cloudBlocks.length]}
      frustumCulled={false}
    >
      <boxGeometry args={[BLOCK_SIZE, 3.5, BLOCK_SIZE]} />
      <meshBasicMaterial fog={false} toneMapped={false} />
    </instancedMesh>
  );
}
