import * as THREE from "three";
import { BLOCK_STONE, BLOCK_OAK_LOG, BLOCK_OAK_LEAVES } from "./constants";

const textureLoader = new THREE.TextureLoader();

// ===============================================
// 1. АТЛАС ДЛЯ МИРА
// ===============================================
export const atlasTexture = textureLoader.load("/textures/atlas.webp");
// magFilter отвечает за вид ВБЛИЗИ. Оставляем Nearest, чтобы блоки были пиксельными и четкими.
atlasTexture.magFilter = THREE.NearestFilter;

// minFilter отвечает за вид ВДАЛИ. Ставим NearestMipmapLinearFilter!
// Он заставит видеокарту плавно уменьшать текстуру вдали, полностью убивая "зерно" и рябь.
atlasTexture.minFilter = THREE.NearestMipmapLinearFilter;
atlasTexture.generateMipmaps = true;
atlasTexture.wrapS = THREE.ClampToEdgeWrapping;
atlasTexture.wrapT = THREE.ClampToEdgeWrapping;
atlasTexture.colorSpace = THREE.SRGBColorSpace;

// ===============================================
// 2. ИДЕАЛЬНЫЙ МЯГКИЙ ШЕЙДЕР И ТУМАН
// ===============================================
// В файле src/utils/materials.ts

function applyCustomColors(shader: any) {
  // 1. ИСПРАВЛЕНИЕ ЗАТЕМНЕНИЯ ЛИСТВЫ (Убираем "волну" света)
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <map_fragment>",
    `
    #ifdef USE_MAP
      vec4 texelColor = texture2D( map, vMapUv );
      
      // Mipmap смешивает зеленый цвет с черным прозрачным фоном.
      // Если пиксель полупрозрачный, мы восстанавливаем его оригинальную яркость!
      if (texelColor.a > 0.0) {
        texelColor.rgb /= texelColor.a;
      }
      
      diffuseColor *= texelColor;
    #endif
    `,
  );

  // 2. ИСПРАВЛЕНИЕ ТУМАНА (Оставляем круглый туман)
  shader.vertexShader = shader.vertexShader.replace(
    "#include <fog_vertex>",
    `
    #ifdef USE_FOG
      vFogDepth = length(mvPosition.xyz);
    #endif
    `,
  );
}

export const atlasMaterial = new THREE.MeshBasicMaterial({
  map: atlasTexture,
  vertexColors: true,
  transparent: false,
  // ИСПРАВЛЕНИЕ 2: Увеличиваем порог отбрасывания пикселей до 0.5 (стандарт для пиксель-арта)
  alphaTest: 0.5,
  // ИСПРАВЛЕНИЕ 3: Ставим FrontSide вместо DoubleSide.
  // Это полностью уберет зернистость и "мерцание" (Z-fighting) внутри кроны дерева!
  side: THREE.FrontSide,
});

atlasMaterial.onBeforeCompile = applyCustomColors;
atlasMaterial.customProgramCacheKey = () => "minecraft_atlas_shader_smooth";

export const globalBlockGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);

// ===============================================
// 3. ТЕКСТУРЫ ДЛЯ ЧАСТИЦ
// ===============================================
function loadParticleTexture(path: string) {
  const tex = textureLoader.load(path);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const dirtTexture = loadParticleTexture(
  "/textures/dirt_grass/Dirt_(texture).webp",
);
export const stoneTexture = loadParticleTexture(
  "/textures/stone/Stone_(texture).webp",
);
export const oakLogSideTexture = loadParticleTexture(
  "/textures/oak_tree/Oak_Log_(texture).webp",
);
export const oakLeavesTexture = loadParticleTexture(
  "/textures/oak_tree/Oak_Leaves_(texture).webp",
);

export function getBlockTexture(blockType: number): THREE.Texture {
  if (blockType === BLOCK_STONE) return stoneTexture;
  if (blockType === BLOCK_OAK_LOG) return oakLogSideTexture;
  if (blockType === BLOCK_OAK_LEAVES) return oakLeavesTexture;
  return dirtTexture;
}

export const crackMaterials = Array.from({ length: 10 }).map((_, stage) => {
  const texture = textureLoader.load(
    "/textures/destroy/destroy_stage_" + stage + ".png",
  );
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    color: "#555555",
  });
});
