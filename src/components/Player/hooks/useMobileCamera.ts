import { useEffect, useRef } from "react";
import * as THREE from "three";
import { mobileControls } from "../../../utils/mobileControls";

const euler = new THREE.Euler(0, 0, 0, "YXZ");
const PI_2 = Math.PI / 2;

export function useMobileCamera(camera: THREE.Camera, isPaused: boolean) {
  const touchId = useRef<number | null>(null);
  const startTouch = useRef<{ x: number; y: number } | null>(null);
  const lastTouch = useRef<{ x: number; y: number } | null>(null);

  // Флаг: мы сейчас ломаем блок или крутим головой?
  const isSwiping = useRef(false);

  useEffect(() => {
    if (isPaused) {
      touchId.current = null;
      startTouch.current = null;
      lastTouch.current = null;
      mobileControls.isMining = false;
      return;
    }

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest(".joystick-zone") ||
        target.closest(".jump-btn") ||
        target.closest(".pause-btn-mobile")
      ) {
        return;
      }

      if (touchId.current !== null) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.clientX > window.innerWidth / 2) {
          touchId.current = touch.identifier;

          // Запоминаем, где палец коснулся экрана
          startTouch.current = { x: touch.clientX, y: touch.clientY };
          lastTouch.current = { x: touch.clientX, y: touch.clientY };
          isSwiping.current = false;

          // Начинаем ломать блок
          mobileControls.isMining = true;
          mobileControls.mineCoords = { x: touch.clientX, y: touch.clientY };
          break;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchId.current === null || !startTouch.current || !lastTouch.current)
        return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchId.current) {
          // Вычисляем, как далеко ушел палец от первоначальной точки
          const dxStart = touch.clientX - startTouch.current.x;
          const dyStart = touch.clientY - startTouch.current.y;
          const distance = Math.sqrt(dxStart * dxStart + dyStart * dyStart);

          // Если палец ушел больше чем на 10 пикселей - это свайп!
          if (!isSwiping.current && distance > 10) {
            isSwiping.current = true;

            // Прекращаем ломать блок, так как крутим головой
            mobileControls.isMining = false;
            mobileControls.mineReleaseTime = performance.now();
          }

          if (isSwiping.current) {
            // КРУТИМ КАМЕРУ
            const movementX = touch.clientX - lastTouch.current.x;
            const movementY = touch.clientY - lastTouch.current.y;

            const sensitivity = 0.005;
            euler.setFromQuaternion(camera.quaternion);
            euler.y -= movementX * sensitivity;
            euler.x -= movementY * sensitivity;
            euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));
            camera.quaternion.setFromEuler(euler);

            lastTouch.current = { x: touch.clientX, y: touch.clientY };
          } else {
            // ЕСЛИ НЕ СВАЙПАЕМ - просто обновляем микро-координаты для кирки
            mobileControls.mineCoords = { x: touch.clientX, y: touch.clientY };
          }
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (touchId.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId.current) {
          touchId.current = null;

          // Отпустили палец - отменяем ломание
          if (!isSwiping.current) {
            mobileControls.isMining = false;
            mobileControls.mineReleaseTime = performance.now();
          }
        }
      }
    };

    document.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: false });
    document.addEventListener("touchcancel", handleTouchEnd, {
      passive: false,
    });

    // === НОВОЕ: Глобальные прерыватели ===
    const handleInterrupt = () => {
      touchId.current = null;
      mobileControls.isMining = false;
      mobileControls.mineReleaseTime = performance.now();
    };

    window.addEventListener("blur", handleInterrupt);
    document.addEventListener("contextmenu", (e) => e.preventDefault()); // Отключаем контекстное меню по долгому тапу

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchEnd);
      window.removeEventListener("blur", handleInterrupt);
      // === КОНЕЦ НОВОГО БЛОКА ===
    };
  }, [camera, isPaused]);
}
