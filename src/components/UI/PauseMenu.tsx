// src/components/UI/PauseMenu.tsx
import { useState } from "react";
import "./MainMenu/MainMenu.scss";

interface PauseMenuProps {
  onResume: () => void;
  canResume: boolean;
  onExitToMenu: () => void;
}

export function PauseMenu({
  onResume,
  canResume,
  onExitToMenu,
}: PauseMenuProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleExit = () => {
    if (isExiting || !canResume) return;
    setIsExiting(true);

    setTimeout(() => {
      onExitToMenu();
    }, 1500);
  };

  // Флаг полной блокировки меню
  const isDisabled = !canResume || isExiting;

  return (
    <div
      className="main-menu"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backgroundImage: "none",
      }}
    >
      <div className="menu-content">
        <h2 className="title" style={{ marginBottom: "40px" }}>
          {isExiting ? "СОХРАНЕНИЕ..." : "ПАУЗА"}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <button
            onClick={onResume}
            disabled={isDisabled}
            className={`mc-button ${isDisabled ? "btn-disabled" : ""}`}
          >
            {isExiting
              ? "Сохранение..."
              : canResume
                ? "Продолжить"
                : "Подождите..."}
          </button>

          <button
            onClick={handleExit}
            disabled={isDisabled}
            className={`mc-button secondary ${isDisabled ? "btn-disabled" : ""}`}
          >
            {isExiting ? "Подождите..." : "Выйти в меню"}
          </button>
        </div>
      </div>
    </div>
  );
}
