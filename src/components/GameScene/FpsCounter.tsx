import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

interface FpsCounterProps {
  fpsTextRef: React.RefObject<HTMLDivElement | null>;
}

export function FpsCounter({ fpsTextRef }: FpsCounterProps) {
  const lastFpsTime = useRef(0);
  const framesThisSecond = useRef(0);

  useFrame(() => {
    framesThisSecond.current++;
    const now = performance.now();

    if (lastFpsTime.current === 0) {
      lastFpsTime.current = lastFpsTime.current = now;
    }

    // Обновляем текст каждую секунду
    if (now - lastFpsTime.current >= 1000) {
      if (fpsTextRef.current) {
        const fps = framesThisSecond.current;
        fpsTextRef.current.innerText = `FPS: ${fps}`;

        if (fps < 30) {
          fpsTextRef.current.style.color = "red";
        } else if (fps < 50) {
          fpsTextRef.current.style.color = "yellow";
        } else {
          fpsTextRef.current.style.color = "#00ff00";
        }
      }
      framesThisSecond.current = 0;
      lastFpsTime.current = now;
    }
  });

  return null; // Компонент работает в фоне и ничего не рендерит
}
