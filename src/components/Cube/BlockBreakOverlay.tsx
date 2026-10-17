import { forwardRef } from "react";
import * as THREE from "three";

export const BlockBreakOverlay = forwardRef<THREE.Mesh>((_, ref) => {
  return (
    <mesh ref={ref} visible={false}>
      <boxGeometry args={[1.503, 1.503, 1.503]} />
      <meshBasicMaterial transparent={true} depthWrite={false} />
    </mesh>
  );
});
