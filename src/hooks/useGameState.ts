import { useState, useRef, useEffect } from "react";
import type { RefObject } from "react";
import type { PointerLockControls } from "@react-three/drei";
import type { World } from "../components/UI/MainMenu/types";
import { IS_MOBILE } from "../utils/constants";

export const useGameState = (
  controlsRef: RefObject<React.ComponentRef<typeof PointerLockControls>>,
) => {
  const [isPaused, setIsPaused] = useState(true);
  const [showFPS, setShowFPS] = useState(false);
  const [canResume, setCanResume] = useState(true);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentWorld, setCurrentWorld] = useState<World | null>(null);

  const fpsTextRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // === НОВОЕ: Функция для перехода в полноэкранный режим ===
  const enterFullscreen = async () => {
    if (!IS_MOBILE) return;
    try {
      const doc = document.documentElement;
      if (doc.requestFullscreen && !document.fullscreenElement) {
        await doc.requestFullscreen();
      }
      // Пытаемся заблокировать ориентацию аппаратно (работает на Android)
      if (screen.orientation && "lock" in screen.orientation) {
        await (screen.orientation as any).lock("landscape").catch(() => {});
      }
    } catch (err) {
      console.warn("Полноэкранный режим не поддерживается", err);
    }
  };

  const handleStartLock = () => {
    setIsGameStarted(true);
    enterFullscreen(); // <--- Вызов Fullscreen

    if (IS_MOBILE) {
      setIsPaused(false);
    } else if (controlsRef.current) {
      controlsRef.current.lock();
    }
  };

  const handleMenuComplete = () => setIsMenuVisible(false);

  const handleResume = () => {
    if (!canResume) return;
    enterFullscreen(); // <--- Вызов Fullscreen при снятии с паузы

    if (IS_MOBILE) {
      setIsPaused(false);
    } else if (controlsRef.current) {
      controlsRef.current.lock();
    }
  };

  const handleUnlock = () => {
    setIsPaused(true);
    setCanResume(false);

    // Выходим из полноэкранного режима при вызове паузы (опционально, но удобно для мобилок)
    if (IS_MOBILE && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCanResume(true);
    }, 1300);
  };

  return {
    isPaused,
    setIsPaused,
    showFPS,
    setShowFPS,
    canResume,
    isGameStarted,
    setIsGameStarted,
    isMenuVisible,
    setIsMenuVisible,
    isGenerating,
    setIsGenerating,
    currentWorld,
    setCurrentWorld,
    fpsTextRef,
    handleStartLock,
    handleMenuComplete,
    handleResume,
    handleUnlock,
  };
};
