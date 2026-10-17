interface CubeProps {
  x: number;
  y: number;
  z: number;
}

export function Cube({ x, y, z }: CubeProps) {
  return (
    <mesh position={[x, y - 0.75, z]}>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
    </mesh>
  );
}
