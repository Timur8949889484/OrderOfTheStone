import { useEffect, useRef } from "react";
import type { PointerLockControls } from "@react-three/drei";

interface UsePlayerControlsProps {
  isPaused: boolean;
  controlsRef: React.RefObject<React.ComponentRef<
    typeof PointerLockControls
  > | null>;
  setShowFPS: React.Dispatch<React.SetStateAction<boolean>>;
}

export function usePlayerControls({
  isPaused,
  controlsRef,
  setShowFPS,
}: UsePlayerControlsProps) {
  // Храним состояния в refs, чтобы не вызывать ререндер при каждом нажатии
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const isMining = useRef(false);
  const mineReleaseTime = useRef(0);
  const zoomDistance = useRef(0);

  // Сбрасываем зажатые клавиши, если игра ставится на паузу
  useEffect(() => {
    if (isPaused) {
      keysPressed.current = {};
    }
  }, [isPaused]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault(); // Предотвращаем прокрутку страницы пробелом
      }

      if (e.code === "NumpadDivide" || e.key === "/") {
        setShowFPS((prev) => !prev);
      }

      // Освобождаем курсор (выход в меню) при нажатии P или E
      if ((e.code === "KeyP" || e.code === "KeyE") && !isPaused) {
        if (controlsRef.current) {
          controlsRef.current.unlock();
        }
      }

      keysPressed.current[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    // Очищаем клавиши, если окно потеряло фокус (Alt+Tab)
    const handleBlur = () => {
      keysPressed.current = {};
    };

    // Приближение/отдаление камеры (zoom)
    const handleWheel = (e: WheelEvent) => {
      if (document.pointerLockElement) {
        const zoomSpeed = 0.01;
        let newZoom = zoomDistance.current + e.deltaY * zoomSpeed;

        if (newZoom < 0) newZoom = 0;
        if (newZoom > 10) newZoom = 10; // Ограничиваем максимальное отдаление

        zoomDistance.current = newZoom;
      }
    };

    // Левая кнопка мыши — начало добычи
    const handleMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement && e.button === 0) {
        isMining.current = true;
        mineReleaseTime.current = 0;
      }
    };

    // Отпускание кнопки мыши — прекращение добычи
    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        isMining.current = false;
        mineReleaseTime.current = performance.now();
      }
    };

    // Подписываемся на события
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    // Отписываемся при размонтировании
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setShowFPS, isPaused, controlsRef]);

  // Возвращаем refs, чтобы другие хуки (физика, майнинг) могли их читать
  return {
    keysPressed,
    isMining,
    mineReleaseTime,
    zoomDistance,
  };
}
