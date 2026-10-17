import { useCallback, useEffect } from "react";
import type {
  RefObject,
  MutableRefObject,
  Dispatch,
  SetStateAction,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import { TerrainManager } from "../Chunk/TerrainManager";
import { Player } from "../Player/Player";
import { Clouds } from "../Clouds/Clouds";
import { DayNightCycle } from "../DayNightCycle/DayNightCycle";
import { FpsCounter } from "./FpsCounter";
import { ParticleManager } from "./ParticleManager";
import {
  MAP_SIZE,
  CHUNK_SIZE,
  FOG_START,
  FOG_END,
  IS_MOBILE, // <-- ДОБАВИЛИ ИМПОРТ
} from "../../utils/constants";

export function GpuCompiler() {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    const handleCompile = () => {
      setTimeout(() => {
        try {
          gl.compile(scene, camera);
          gl.render(scene, camera);
        } catch (error) {
          console.warn("Ошибка при запекании GPU, пропускаем:", error);
        } finally {
          window.dispatchEvent(new CustomEvent("gpu-compile-complete"));
        }
      }, 150);
    };

    window.addEventListener("gpu-compile", handleCompile);
    return () => window.removeEventListener("gpu-compile", handleCompile);
  }, [gl, scene, camera]);

  return null;
}

interface GameSceneProps {
  isPaused: boolean;
  isGameStarted: boolean;
  isGenerating: boolean;
  timeRef: MutableRefObject<number>;
  currentChunkX: number;
  currentChunkZ: number;
  onBlockBreak: (x: number, y: number, z: number) => void;
  controlsRef: RefObject<any>;
  fpsTextRef: RefObject<HTMLDivElement | null>;
  setShowFPS: Dispatch<SetStateAction<boolean>>;
  handleUnlock: () => void;
  setIsPaused: (paused: boolean) => void;
  currentWorldId?: string;
  currentWorldSeed?: string;
  playerPosRef: MutableRefObject<{ x: number; y: number; z: number }>;
  handleChunkChange: (chunkX: number, chunkZ: number) => void;
  isReady?: boolean;
}

export const GameScene = ({
  isPaused,
  isGameStarted,
  isGenerating,
  timeRef,
  currentChunkX,
  currentChunkZ,
  onBlockBreak,
  controlsRef,
  fpsTextRef,
  setShowFPS,
  handleUnlock,
  setIsPaused,
  currentWorldId,
  currentWorldSeed,
  playerPosRef,
  handleChunkChange,
}: GameSceneProps) => {
  const handleMiningHit = useCallback(
    (x: number, y: number, z: number, blockType: number = 2) => {
      window.dispatchEvent(
        new CustomEvent("spawn-mining-particles", {
          detail: { x, y, z, blockType },
        }),
      );
    },
    [],
  );

  const handleBlockBreakWithParticles = useCallback(
    (x: number, y: number, z: number, blockType: number = 2) => {
      window.dispatchEvent(
        new CustomEvent("spawn-break-particles", {
          detail: { x, y, z, blockType },
        }),
      );
      onBlockBreak(x, y, z);
      window.dispatchEvent(
        new CustomEvent("block-broken", {
          detail: {
            x: Math.round(x),
            y: Math.round(y),
            z: Math.round(z),
            blockType,
          },
        }),
      );
    },
    [onBlockBreak],
  );

  return (
    <Canvas
      camera={{ fov: 60, near: 0.1, far: 1000 }}
      // ИСПРАВЛЕНИЕ: На мобилках строго 1, на ПК можно до 1.5
      dpr={IS_MOBILE ? 1 : [1, 1.5]}
      gl={{
        powerPreference: "high-performance",
        antialias: false,
        stencil: false,
        depth: true,
      }}
    >
      <color attach="background" args={["#87CEEB"]} />
      <fog attach="fog" args={["#87CEEB", FOG_START, FOG_END]} />

      <GpuCompiler />
      <FpsCounter fpsTextRef={fpsTextRef} />
      <DayNightCycle
        mapSize={MAP_SIZE}
        isPaused={isPaused || !isGameStarted}
        timeRef={timeRef}
      />

      <TerrainManager
        playerChunkX={currentChunkX}
        playerChunkZ={currentChunkZ}
        seed={currentWorldSeed}
        isGenerating={isGenerating}
      />

      <Clouds mapSize={MAP_SIZE} isPaused={isPaused || !isGameStarted} />

      <ParticleManager />

      <Player
        isPaused={isPaused || !isGameStarted}
        controlsRef={controlsRef}
        setShowFPS={setShowFPS}
        mapSize={MAP_SIZE}
        chunkSize={CHUNK_SIZE}
        onChunkChange={handleChunkChange}
        worldId={currentWorldId}
        seed={currentWorldSeed}
        posRef={playerPosRef}
        onBlockBreak={handleBlockBreakWithParticles}
        onMiningHit={handleMiningHit}
      />

      {/* ПК-контроллер скрыт на мобилках */}
      {!IS_MOBILE && (
        <PointerLockControls
          ref={controlsRef}
          selector="#unclickable"
          onLock={() => setIsPaused(false)}
          onUnlock={handleUnlock}
        />
      )}
    </Canvas>
  );
};
