import { useRef, useEffect } from "react"; // <--- Добавили useEffect
import type { RefObject } from "react";
import { IS_MOBILE } from "../../utils/constants";
import { mobileControls } from "../../utils/mobileControls";

interface GameOverlayProps {
  showFPS: boolean;
  fpsTextRef: RefObject<HTMLDivElement>;
  isPaused: boolean;
  isGameStarted: boolean;
  isMenuVisible: boolean;
  onOpenMenu: () => void;
}

export const GameOverlay = ({
  showFPS,
  fpsTextRef,
  isPaused,
  isGameStarted,
  isMenuVisible,
  onOpenMenu,
}: GameOverlayProps) => {
  const isPlaying = !isPaused && isGameStarted && !isMenuVisible;

  const knobRef = useRef<HTMLDivElement>(null);
  const joystickCenter = useRef({ x: 0, y: 0 });
  const touchId = useRef<number | null>(null);

  // === НОВОЕ: Глобальная проверка отпускания пальца ===
  useEffect(() => {
    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (touchId.current === null) return;

      // Проверяем, остался ли наш палец на экране
      let isTouchActive = false;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchId.current) {
          isTouchActive = true;
          break;
        }
      }

      // Если пальца больше нет в списке активных, сбрасываем джойстик
      if (!isTouchActive) {
        touchId.current = null;
        if (knobRef.current) {
          knobRef.current.style.transform = `translate(-50%, -50%)`;
        }
        mobileControls.forward = 0;
        mobileControls.right = 0;
      }
    };

    window.addEventListener("touchend", handleGlobalTouchEnd);
    window.addEventListener("touchcancel", handleGlobalTouchEnd);
    return () => {
      window.removeEventListener("touchend", handleGlobalTouchEnd);
      window.removeEventListener("touchcancel", handleGlobalTouchEnd);
    };
  }, []);
  // ====================================================

  const handleJoystickTouch = (e: React.TouchEvent) => {
    if (touchId.current !== null) return;
    const touch = e.changedTouches[0];
    touchId.current = touch.identifier;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    joystickCenter.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleJoystickMove = (e: React.TouchEvent) => {
    // Останавливаем скролл экрана
    e.preventDefault();

    if (touchId.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchId.current) {
        updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    const dx = clientX - joystickCenter.current.x;
    const dy = clientY - joystickCenter.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const maxRadius = 40;
    let knobX = dx;
    let knobY = dy;

    if (distance > maxRadius) {
      knobX = (dx / distance) * maxRadius;
      knobY = (dy / distance) * maxRadius;
    }

    if (knobRef.current) {
      knobRef.current.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
    }

    mobileControls.right = knobX / maxRadius;
    mobileControls.forward = -(knobY / maxRadius);
  };

  // Локальный обработчик можно оставить для надежности
  const handleJoystickEnd = (e: React.TouchEvent) => {
    if (touchId.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchId.current) {
        touchId.current = null;
        if (knobRef.current) {
          knobRef.current.style.transform = `translate(-50%, -50%)`;
        }
        mobileControls.forward = 0;
        mobileControls.right = 0;
        break;
      }
    }
  };

  return (
    <>
      {showFPS && (
        <div ref={fpsTextRef} className="fps-counter">
          FPS: ...
        </div>
      )}

      {isPlaying && !IS_MOBILE && <div className="crosshair"></div>}

      {isPlaying && IS_MOBILE && (
        <div className="mobile-controls">
          <div
            className="joystick-zone"
            onTouchStart={handleJoystickTouch}
            onTouchMove={handleJoystickMove}
            onTouchEnd={handleJoystickEnd}
            onTouchCancel={handleJoystickEnd}
          >
            <div className="joystick-knob" ref={knobRef} />
          </div>

          <div
            className="jump-btn"
            onTouchStart={() => (mobileControls.jump = true)}
            onTouchEnd={() => (mobileControls.jump = false)}
            onTouchCancel={() => (mobileControls.jump = false)}
          >
            ▲
          </div>

          <div
            className="pause-btn-mobile"
            onTouchStart={(e) => {
              e.stopPropagation();
              onOpenMenu();
            }}
          >
            ||
          </div>
        </div>
      )}
    </>
  );
};
