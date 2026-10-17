import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import * as THREE from "three";

import { usePlayerControls } from "./hooks/usePlayerControls";
import { usePlayerPhysics } from "./hooks/usePlayerPhysics";
import { usePlayerMining } from "./hooks/usePlayerMining";
import { BlockBreakOverlay } from "../Cube/BlockBreakOverlay";
import { useMobileCamera } from "./hooks/useMobileCamera";
import { IS_MOBILE } from "../../utils/constants";

interface PlayerProps {
  isPaused: boolean;
  controlsRef: React.RefObject<any>;
  setShowFPS: React.Dispatch<React.SetStateAction<boolean>>;
  mapSize: number;
  chunkSize: number;
  onChunkChange: (chunkX: number, chunkZ: number) => void;
  worldId?: string;
  seed?: string;
  posRef: React.MutableRefObject<{ x: number; y: number; z: number }>;
  onBlockBreak: (x: number, y: number, z: number, blockType?: number) => void;
  onMiningHit: (x: number, y: number, z: number, blockType?: number) => void;
}

const EYE_HEIGHT = 2.4;

const tempEyesPosition = new THREE.Vector3();
const tempBackVector = new THREE.Vector3();
const tempEuler = new THREE.Euler(0, 0, 0, "YXZ");

export function Player({
  isPaused,
  controlsRef,
  setShowFPS,
  mapSize,
  chunkSize,
  onChunkChange,
  worldId,
  posRef,
  onBlockBreak,
  onMiningHit,
}: PlayerProps) {
  const { camera } = useThree();
  const playerMeshRef = useRef<THREE.Mesh>(null!);
  const crackMeshRef = useRef<THREE.Mesh>(null!);

  const { keysPressed, isMining, mineReleaseTime, zoomDistance } =
    usePlayerControls({
      isPaused,
      controlsRef,
      setShowFPS,
    });

  const { updatePhysics } = usePlayerPhysics({
    posRef,
    keysPressed,
    isPaused,
    mapSize,
    chunkSize,
    onChunkChange,
    camera,
    worldId,
  });

  const { updateMining } = usePlayerMining({
    camera,
    isMining, // Теперь без scene!
    mineReleaseTime,
    onBlockBreak,
    onMiningHit,
  });

  // НОВОЕ: Включаем мобильную камеру
  useMobileCamera(camera, isPaused);

  useEffect(() => {
    if (worldId) {
      camera.position.set(
        posRef.current.x,
        posRef.current.y + EYE_HEIGHT,
        posRef.current.z,
      );
    }
  }, [worldId, camera, posRef]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const now = performance.now();

    if (!isPaused && (document.pointerLockElement || IS_MOBILE)) {
      updateMining(dt, now, crackMeshRef);
    }

    updatePhysics(dt);

    if (playerMeshRef.current) {
      playerMeshRef.current.position.set(
        posRef.current.x,
        posRef.current.y + 1.5,
        posRef.current.z,
      );

      tempEuler.setFromQuaternion(camera.quaternion);
      playerMeshRef.current.rotation.y = tempEuler.y;
      playerMeshRef.current.visible = zoomDistance.current > 0.5;
    }

    tempEyesPosition.set(
      posRef.current.x,
      posRef.current.y + EYE_HEIGHT,
      posRef.current.z,
    );

    camera.getWorldDirection(tempBackVector);
    tempBackVector.negate().multiplyScalar(zoomDistance.current);
    camera.position.copy(tempEyesPosition).add(tempBackVector);
  });

  return (
    <>
      <mesh ref={playerMeshRef} visible={false}>
        <boxGeometry args={[1.5, 3, 1.5]} />
        <meshStandardMaterial color="#e53935" />
        <Edges color="rgba(0, 0, 0, 0.3)" lineWidth={2} />
      </mesh>

      <BlockBreakOverlay ref={crackMeshRef} />
    </>
  );
}
