import { useState, useCallback, useEffect } from "react";
import { BlockParticles } from "../Particles/BlockParticles";
import { getBlockTexture } from "../../utils/materials";

const BLOCK_SIZE = 1.5;

export const ParticleManager = () => {
  const [particleBursts, setParticleBursts] = useState<any[]>([]);

  const removeParticles = useCallback((id: number) => {
    setParticleBursts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  useEffect(() => {
    const handleMining = (e: any) => {
      const { x, y, z, blockType } = e.detail;
      setParticleBursts((prev) => {
        if (prev.length > 15) return prev;
        return [
          ...prev,
          {
            id: performance.now() + Math.random(),
            position: [x * BLOCK_SIZE, (y - 0.5) * BLOCK_SIZE, z * BLOCK_SIZE],
            texture: getBlockTexture(blockType),
            count: 3,
            speedMultiplier: 0.6,
          },
        ];
      });
    };

    const handleBreak = (e: any) => {
      const { x, y, z, blockType } = e.detail;
      setParticleBursts((prev) => [
        ...prev.slice(-10),
        {
          id: performance.now() + Math.random(),
          position: [x * BLOCK_SIZE, (y - 0.5) * BLOCK_SIZE, z * BLOCK_SIZE],
          texture: getBlockTexture(blockType),
          count: 20,
          speedMultiplier: 1.5,
        },
      ]);
    };

    window.addEventListener("spawn-mining-particles", handleMining);
    window.addEventListener("spawn-break-particles", handleBreak);

    return () => {
      window.removeEventListener("spawn-mining-particles", handleMining);
      window.removeEventListener("spawn-break-particles", handleBreak);
    };
  }, []);

  return (
    <>
      {particleBursts.map((burst) => (
        <BlockParticles
          key={burst.id}
          id={burst.id}
          position={burst.position}
          texture={burst.texture}
          count={burst.count}
          speedMultiplier={burst.speedMultiplier}
          onComplete={removeParticles}
        />
      ))}
    </>
  );
};
