import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getBlockType } from "../../utils/terrain";
import { blockStore } from "../../store/blockStore";

const dummy = new THREE.Object3D();
const BLOCK_SIZE = 1.5;

interface BlockParticlesProps {
  id: number;
  position: [number, number, number];
  texture: THREE.Texture;
  count?: number;
  speedMultiplier?: number;
  onComplete: (id: number) => void;
}

// ВОТ ЗДЕСЬ ОБЯЗАТЕЛЬНО ДОЛЖНО БЫТЬ СЛОВО export
export const BlockParticles = ({
  id,
  position,
  texture,
  count = 12,
  speedMultiplier = 1,
  onComplete,
}: BlockParticlesProps) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Data-Oriented Design: Вместо объектов используем плоские массивы чисел! 0 мусора в памяти.
  const { pos, vel, scale, shrink, delay } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const scale = new Float32Array(count);
    const shrink = new Float32Array(count);
    const delay = new Float32Array(count);

    const spread = 0.6;
    for (let i = 0; i < count; i++) {
      pos[i * 3] = position[0] + (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = position[1] + (Math.random() - 0.5) * spread;
      pos[i * 3 + 2] = position[2] + (Math.random() - 0.5) * spread;

      vel[i * 3] = (Math.random() - 0.5) * 3 * speedMultiplier;
      vel[i * 3 + 1] = Math.random() * 2.5 * speedMultiplier + 0.5;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 3 * speedMultiplier;

      scale[i] = Math.random() * 0.2 + 0.1;
      shrink[i] = Math.random() * 0.8 + 0.5;
      delay[i] = Math.random() * 0.1 + 0.1;
    }
    return { pos, vel, scale, shrink, delay };
  }, [position, count, speedMultiplier]);

  const ageRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => onComplete(id), 600);
    return () => clearTimeout(timer);
  }, [id, onComplete]);

  useFrame(({ camera }, delta) => {
    if (!meshRef.current) return;
    const safeDelta = Math.min(delta, 0.05);
    ageRef.current += safeDelta;
    const currentAge = ageRef.current;

    for (let i = 0; i < count; i++) {
      let px = pos[i * 3];
      let py = pos[i * 3 + 1];
      let pz = pos[i * 3 + 2];

      let vx = vel[i * 3];
      let vy = vel[i * 3 + 1];
      let vz = vel[i * 3 + 2];

      // Если частица еще в движении
      if (vy !== 0 || vx !== 0 || vz !== 0) {
        vy -= 18 * safeDelta;

        const nextX = px + vx * safeDelta;
        const nextY = py + vy * safeDelta;
        const nextZ = pz + vz * safeDelta;

        const gridX = Math.round(nextX / BLOCK_SIZE);
        const gridY = Math.round(nextY / BLOCK_SIZE + 0.5);
        const gridZ = Math.round(nextZ / BLOCK_SIZE);

        const isBroken = blockStore.isBlockBroken(gridX, gridY, gridZ);
        const blockBelow = isBroken ? 0 : getBlockType(gridX, gridY, gridZ);

        if (blockBelow !== 0) {
          const blockTopY = gridY * BLOCK_SIZE;
          if (py >= blockTopY && nextY <= blockTopY) {
            py = blockTopY + 0.02;
            vx = 0;
            vy = 0;
            vz = 0; // Упали на землю - останавливаемся
          } else {
            py = nextY;
          }
        } else {
          py = nextY;
        }

        if (vy !== 0) {
          px = nextX;
          pz = nextZ;
        }

        pos[i * 3] = px;
        pos[i * 3 + 1] = py;
        pos[i * 3 + 2] = pz;
        vel[i * 3] = vx;
        vel[i * 3 + 1] = vy;
        vel[i * 3 + 2] = vz;
      }

      if (currentAge > delay[i]) {
        scale[i] -= shrink[i] * safeDelta;
      }
      const currentScale = Math.max(0, scale[i]);

      dummy.position.set(px, py, pz);
      dummy.quaternion.copy(camera.quaternion); // Частицы смотрят в камеру
      dummy.scale.set(currentScale, currentScale, currentScale);
      dummy.updateMatrix();

      meshRef.current!.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined as any, undefined as any, count]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial
        map={texture}
        side={THREE.DoubleSide}
        transparent
        alphaTest={0.1}
        roughness={0.9}
        metalness={0.1}
      />
    </instancedMesh>
  );
};
