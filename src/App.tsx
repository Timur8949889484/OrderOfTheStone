import { useRef } from "react";
import type { RefObject } from "react";
import type { PointerLockControls } from "@react-three/drei";
import { MainMenu } from "./components/UI/MainMenu/MainMenu";
import { PauseMenu } from "./components/UI/PauseMenu";
import { GameOverlay } from "./components/UI/GameOverlay";
import { GameScene } from "./components/GameScene/GameScene";

import { useGameState } from "./hooks/useGameState";
import { useWorldSave } from "./hooks/useWorldSave";
import { useBlockManager } from "./hooks/useBlockManager";
import { useChunkManager } from "./utils/useChunkManager";

import { MAP_SIZE, CHUNK_SIZE } from "./utils/constants";
import { initTerrainSeed } from "./utils/terrain";
import "./App.scss";

const BLOCK_SIZE = 1.5;

function App() {
  const controlsRef =
    useRef<React.ComponentRef<typeof PointerLockControls>>(null);

  const gameState = useGameState(
    controlsRef as RefObject<React.ComponentRef<typeof PointerLockControls>>,
  );

  const { handleBlockBreak } = useBlockManager(
    gameState.currentWorld?.modified_blocks,
  );

  const { currentWorldIdRef, playerPosRef, timeRef, saveWorldData } =
    useWorldSave(gameState.currentWorld);

  const startChunkX = gameState.currentWorld?.player_pos
    ? Math.floor(
        gameState.currentWorld.player_pos.x / (CHUNK_SIZE * BLOCK_SIZE),
      )
    : Math.floor((MAP_SIZE * BLOCK_SIZE) / 2 / (CHUNK_SIZE * BLOCK_SIZE));

  const startChunkZ = gameState.currentWorld?.player_pos
    ? Math.floor(
        gameState.currentWorld.player_pos.z / (CHUNK_SIZE * BLOCK_SIZE),
      )
    : Math.floor((MAP_SIZE * BLOCK_SIZE) / 2 / (CHUNK_SIZE * BLOCK_SIZE));

  const {
    currentChunkX,
    currentChunkZ,
    handleChunkChange,
    progress,
    isReady,
    stage,
  } = useChunkManager(
    startChunkX,
    startChunkZ,
    gameState.isGenerating,
    gameState.currentWorld?.id,
  );

  const handleExitToMenu = () => {
    if (controlsRef.current) controlsRef.current.unlock();
    gameState.setIsPaused(true);
    gameState.setIsGameStarted(false);
    gameState.setIsGenerating(false);

    saveWorldData();

    currentWorldIdRef.current = null;
    gameState.setCurrentWorld(null);
    gameState.setIsMenuVisible(true);
  };

  return (
    <>
      <div className="portrait-lock">
        <div className="portrait-lock-icon">📱</div>
        <p>
          Пожалуйста, переверните
          <br />
          устройство горизонтально
        </p>
      </div>

      {/* НОВОЕ: Добавлен onContextMenu */}
      <div className="app-container" onContextMenu={(e) => e.preventDefault()}>
        {gameState.isMenuVisible && (
          <MainMenu
            onStartLock={gameState.handleStartLock}
            onComplete={gameState.handleMenuComplete}
            onStartGenerating={(world) => {
              initTerrainSeed(world.seed);
              currentWorldIdRef.current = world.id;

              const spawn = Math.floor((MAP_SIZE * BLOCK_SIZE) / 2);
              playerPosRef.current = world.player_pos
                ? { ...world.player_pos }
                : { x: spawn, y: 25 * BLOCK_SIZE, z: spawn };

              timeRef.current = world.time_of_day || 0;

              gameState.setCurrentWorld(world);
              gameState.setIsGenerating(true);
            }}
            progress={progress}
            isReady={isReady}
            generationStage={stage}
          />
        )}

        {gameState.isPaused &&
          gameState.isGameStarted &&
          !gameState.isMenuVisible && (
            <PauseMenu
              onResume={gameState.handleResume}
              canResume={gameState.canResume}
              onExitToMenu={handleExitToMenu}
            />
          )}

        <GameOverlay
          showFPS={gameState.showFPS}
          fpsTextRef={gameState.fpsTextRef as RefObject<HTMLDivElement>}
          isPaused={gameState.isPaused}
          isGameStarted={gameState.isGameStarted}
          isMenuVisible={gameState.isMenuVisible}
          onOpenMenu={gameState.handleUnlock} // <--- ДОБАВИЛИ ЭТО
        />

        <GameScene
          isPaused={gameState.isPaused}
          isGameStarted={gameState.isGameStarted}
          isGenerating={gameState.isGenerating}
          timeRef={timeRef}
          currentChunkX={currentChunkX}
          currentChunkZ={currentChunkZ}
          onBlockBreak={handleBlockBreak}
          controlsRef={controlsRef}
          fpsTextRef={gameState.fpsTextRef as RefObject<HTMLDivElement>}
          setShowFPS={gameState.setShowFPS}
          handleUnlock={gameState.handleUnlock}
          setIsPaused={gameState.setIsPaused}
          currentWorldId={gameState.currentWorld?.id}
          currentWorldSeed={gameState.currentWorld?.seed}
          playerPosRef={playerPosRef}
          handleChunkChange={handleChunkChange}
          isReady={isReady}
        />
      </div>
    </>
  );
}

export default App;
