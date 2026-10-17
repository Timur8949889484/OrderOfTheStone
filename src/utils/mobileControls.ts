// src/utils/mobileControls.ts
export const mobileControls = {
  forward: 0,
  right: 0,
  jump: false,

  // Добавляем данные для ломания
  isMining: false,
  mineCoords: null as { x: number; y: number } | null,
  mineReleaseTime: 0,
};
