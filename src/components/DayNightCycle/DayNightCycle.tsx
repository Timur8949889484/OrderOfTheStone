import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface DayNightCycleProps {
  mapSize: number;
  isPaused: boolean;
  timeRef: React.MutableRefObject<number>;
}

// -------------------------------------------------------------
// Canvas-текстуры
// -------------------------------------------------------------
const createSunCanvas = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#fdf9d1";
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = "#f9eb76";
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, 64, 64);
  }
  return canvas;
};

const createSunGlowCanvas = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 20, 64, 64, 64);
    grad.addColorStop(0, "rgba(255, 235, 140, 0.35)");
    grad.addColorStop(0.7, "rgba(255, 235, 140, 0.25)");
    grad.addColorStop(1, "rgba(255, 235, 140, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  return canvas;
};

const createMoonCanvas = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#F5F5F5";
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = "#9E9E9E";
    ctx.fillRect(8, 12, 16, 16);
    ctx.fillRect(40, 8, 12, 12);
    ctx.fillRect(16, 40, 14, 14);
    ctx.fillRect(44, 38, 10, 10);
  }
  return canvas;
};

const createMoonGlowCanvas = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.6)");
    grad.addColorStop(0.3, "rgba(200, 220, 255, 0.2)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  return canvas;
};

const createStarCanvas = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(230, 245, 255, 1)");
    grad.addColorStop(0.3, "rgba(160, 210, 255, 0.4)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(12, 12, 8, 8);
  }
  return canvas;
};

const sunTexture = new THREE.CanvasTexture(createSunCanvas());
sunTexture.magFilter = THREE.NearestFilter;
sunTexture.minFilter = THREE.NearestFilter;

const sunGlowTexture = new THREE.CanvasTexture(createSunGlowCanvas());
sunGlowTexture.magFilter = THREE.LinearFilter;
sunGlowTexture.minFilter = THREE.LinearFilter;

const moonTexture = new THREE.CanvasTexture(createMoonCanvas());
moonTexture.magFilter = THREE.NearestFilter;
moonTexture.minFilter = THREE.NearestFilter;

const moonGlowTexture = new THREE.CanvasTexture(createMoonGlowCanvas());
moonGlowTexture.magFilter = THREE.NearestFilter;
moonGlowTexture.minFilter = THREE.NearestFilter;

const starTexture = new THREE.CanvasTexture(createStarCanvas());
starTexture.magFilter = THREE.NearestFilter;
starTexture.minFilter = THREE.NearestFilter;

function pureRandom(seed: number): number {
  const x = Math.sin(seed) * 43758.5453123;
  return x - Math.floor(x);
}

export function DayNightCycle({ isPaused, timeRef }: DayNightCycleProps) {
  const skyGroupRef = useRef<THREE.Group>(null);
  const celestialWheelRef = useRef<THREE.Group>(null);

  const sunMeshRef = useRef<THREE.Group>(null);
  const moonMeshRef = useRef<THREE.Group>(null);

  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const moonLightRef = useRef<THREE.DirectionalLight>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight>(null);

  const sunGlowMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const moonGlowMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const starsMeshRef = useRef<THREE.InstancedMesh>(null);
  const starMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const starsInitialized = useRef(false);

  const DAY_MINUTES = 10;
  const NIGHT_MINUTES = 10;
  const DAY_DURATION = DAY_MINUTES * 60;
  const NIGHT_DURATION = NIGHT_MINUTES * 60;
  const CYCLE_DURATION = DAY_DURATION + NIGHT_DURATION;
  const DAY_RATIO = DAY_DURATION / CYCLE_DURATION;

  const RADIUS = 450; // Было 180

  const colors = useMemo(
    () => ({
      daySkyColor: new THREE.Color("#87CEEB"),
      nightSkyColor: new THREE.Color("#05070a"),
      dayHemiSky: new THREE.Color("#ffffff"),
      nightHemiSky: new THREE.Color("#2a3b5c"),
      dayHemiGround: new THREE.Color("#8a9e8a"),
      nightHemiGround: new THREE.Color("#0f1522"),
    }),
    [],
  );

  const starData = useMemo(() => {
    const stars = [];
    const TOTAL_STARS = 150;
    const STAR_DOME_RADIUS = 480; // Было 195

    for (let i = 0; i < TOTAL_STARS; i++) {
      const theta = pureRandom(i * 15.23 + 42.12) * Math.PI * 2;
      const phi = (pureRandom(i * 27.53 + 11.74) * 0.42 + 0.05) * Math.PI;

      const x = Math.cos(theta) * Math.sin(phi) * STAR_DOME_RADIUS;
      const y = Math.abs(Math.cos(phi)) * STAR_DOME_RADIUS + 15;
      const z = Math.sin(theta) * Math.sin(phi) * STAR_DOME_RADIUS;

      // Умножили масштаб звезд на 2.5, так как они теперь дальше
      const scale = (pureRandom(i * 33.11 + 84.25) * 0.9 + 0.4) * 2.5;
      stars.push({ x, y, z, scale });
    }
    return stars;
  }, []);

  const sunWorldPos = useMemo(() => new THREE.Vector3(), []);
  const moonWorldPos = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    if (!isPaused) {
      timeRef.current += delta;
    }

    const camPos = state.camera.position;

    if (skyGroupRef.current) {
      skyGroupRef.current.position.set(camPos.x, 0, camPos.z);
    }

    const time = timeRef.current;
    const progress = (time % CYCLE_DURATION) / CYCLE_DURATION;

    let angle: number;
    if (progress < DAY_RATIO) {
      const dayProgress = progress / DAY_RATIO;
      angle = dayProgress * Math.PI;
    } else {
      const nightProgress = (progress - DAY_RATIO) / (1 - DAY_RATIO);
      angle = Math.PI + nightProgress * Math.PI;
    }

    if (celestialWheelRef.current) {
      celestialWheelRef.current.rotation.z = angle - Math.PI / 2;
    }

    const elevation = Math.sin(angle);
    let blend = (elevation + 0.2) / 0.4;
    blend = THREE.MathUtils.clamp(blend, 0, 1);

    const scene = state.scene;

    if (scene.background instanceof THREE.Color) {
      scene.background.lerpColors(
        colors.nightSkyColor,
        colors.daySkyColor,
        blend,
      );
    }
    if (scene.fog) {
      scene.fog.color.lerpColors(
        colors.nightSkyColor,
        colors.daySkyColor,
        blend,
      );
    }

    if (sunGlowMatRef.current)
      sunGlowMatRef.current.opacity = THREE.MathUtils.lerp(0, 1.0, blend);
    if (moonGlowMatRef.current)
      moonGlowMatRef.current.opacity = THREE.MathUtils.lerp(0.7, 0, blend);

    if (starMatRef.current) {
      let starOpacity = 0;
      if (elevation < -0.05) {
        starOpacity =
          THREE.MathUtils.clamp((-elevation - 0.05) / 0.2, 0, 1) * 0.95;
      }
      starMatRef.current.opacity = starOpacity;
    }

    if (starsMeshRef.current && !starsInitialized.current) {
      const dummy = new THREE.Object3D();
      const originVector = new THREE.Vector3(0, 0, 0);
      starData.forEach((star, i) => {
        dummy.position.set(star.x, star.y, star.z);
        dummy.lookAt(originVector);
        dummy.rotateZ(Math.PI / 4);
        dummy.scale.setScalar(star.scale);
        dummy.updateMatrix();
        starsMeshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      starsMeshRef.current.instanceMatrix.needsUpdate = true;
      starsInitialized.current = true;
    }

    if (sunMeshRef.current) sunMeshRef.current.getWorldPosition(sunWorldPos);
    if (moonMeshRef.current) moonMeshRef.current.getWorldPosition(moonWorldPos);

    if (dirLightRef.current) {
      dirLightRef.current.position.copy(sunWorldPos);
      dirLightRef.current.intensity = THREE.MathUtils.lerp(0, 0.2, blend);
      dirLightRef.current.target.position.set(camPos.x, 0, camPos.z);
      dirLightRef.current.target.updateMatrixWorld();
    }

    if (moonLightRef.current) {
      moonLightRef.current.position.copy(moonWorldPos);
      moonLightRef.current.intensity = THREE.MathUtils.lerp(0.25, 0, blend);
      moonLightRef.current.target.position.set(camPos.x, 0, camPos.z);
      moonLightRef.current.target.updateMatrixWorld();
    }

    if (hemiLightRef.current) {
      hemiLightRef.current.intensity = THREE.MathUtils.lerp(2.5, 1.0, blend);
      hemiLightRef.current.color.lerpColors(
        colors.nightHemiSky,
        colors.dayHemiSky,
        blend,
      );
      hemiLightRef.current.groundColor.lerpColors(
        colors.nightHemiGround,
        colors.dayHemiGround,
        blend,
      );
    }
  });

  // В файле src/components/DayNightCycle/DayNightCycle.tsx

  // В файле src/components/DayNightCycle/DayNightCycle.tsx

  return (
    <>
      <hemisphereLight ref={hemiLightRef} />
      <directionalLight ref={dirLightRef} color="#ffffff" intensity={0} />
      <directionalLight ref={moonLightRef} color="#90b0e0" intensity={0} />

      <group ref={skyGroupRef}>
        <instancedMesh
          ref={starsMeshRef}
          /* УБРАЛИ renderOrder={1} отсюда */
          args={[undefined, undefined, starData.length]}
          frustumCulled={false}
        >
          <planeGeometry args={[4.5, 4.5]} />
          <meshBasicMaterial
            ref={starMatRef}
            map={starTexture}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            fog={false}
          />
        </instancedMesh>

        <group ref={celestialWheelRef}>
          <group
            ref={sunMeshRef}
            position={[0, RADIUS, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <mesh>
              <boxGeometry args={[100, 100, 2]} /> {/* Было [40, 40, 2] */}
              <meshBasicMaterial map={sunTexture} fog={false} />
            </mesh>
            <mesh position={[0, 0, -1.1]}>
              <planeGeometry args={[275, 275]} /> {/* Было [110, 110] */}
              <meshBasicMaterial
                ref={sunGlowMatRef}
                map={sunGlowTexture}
                transparent
                depthWrite={false}
                fog={false}
              />
            </mesh>
          </group>

          <group
            ref={moonMeshRef}
            position={[0, -RADIUS, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <mesh>
              <boxGeometry args={[65, 65, 2]} /> {/* Было [27, 27, 2] */}
              <meshBasicMaterial map={moonTexture} fog={false} />
            </mesh>
            <mesh position={[0, 0, -1.1]}>
              <planeGeometry args={[185, 185]} /> {/* Было [75, 75] */}
              <meshBasicMaterial
                ref={moonGlowMatRef}
                map={moonGlowTexture}
                transparent
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                fog={false}
              />
            </mesh>
          </group>
        </group>
      </group>
    </>
  );
}
