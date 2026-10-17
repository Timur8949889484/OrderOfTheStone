// interface GenerationScreenProps {
//   stage: "generating" | "baking" | "ready";
//   isNewWorld: boolean;
//   progress: number;
//   onEnterWorld: () => void;
// }

// export function GenerationScreen({
//   stage,
//   isNewWorld,
//   progress,
//   onEnterWorld,
// }: GenerationScreenProps) {
//   const getStageTitle = () => {
//     if (stage === "ready") return "Мир успешно создан!";
//     if (stage === "baking" || progress >= 85)
//       return "Запекание текстур и шейдеров (GPU)...";
//     return isNewWorld ? "Генерация ландшафта..." : "Загрузка сохранения...";
//   };

//   return (
//     <div className="generation-screen">
//       <h2 className="subtitle">{getStageTitle()}</h2>

//       <div className="progress-bar-container">
//         <div
//           className="progress-bar"
//           style={{
//             width: `${progress}%`,
//             transition: "width 0.2s ease-out",
//           }}
//         />
//       </div>

//       <div className="progress-text">{progress}%</div>

//       {stage === "ready" && (
//         <button
//           className="mc-button"
//           style={{ marginTop: "30px" }}
//           onClick={onEnterWorld}
//         >
//           Войти в мир
//         </button>
//       )}
//     </div>
//   );
// }
interface GenerationScreenProps {
  stage: "generating" | "baking" | "ready";
  isNewWorld: boolean;
  progress: number;
  onEnterWorld: () => void;
}

export function GenerationScreen({
  stage,
  isNewWorld,
  progress,
  onEnterWorld,
}: GenerationScreenProps) {
  const getStageTitle = () => {
    if (stage === "ready" || progress >= 100) return "Мир успешно создан!";
    if (stage === "baking" || progress >= 85)
      return "Запекание текстур и шейдеров (GPU)...";
    return isNewWorld ? "Генерация ландшафта..." : "Загрузка сохранения...";
  };

  return (
    <div className="generation-screen">
      <h2 className="subtitle">{getStageTitle()}</h2>

      <div className="progress-bar-container">
        <div
          className="progress-bar"
          style={{
            width: `${progress}%`,
            transition: "width 0.2s ease-out",
          }}
        />
      </div>

      <div className="progress-text">{progress}%</div>

      {/* Кнопка теперь появится ГАРАНТИРОВАННО, когда прогресс дойдет до 100% */}
      {(stage === "ready" || progress >= 100) && (
        <button
          className="mc-button"
          style={{ marginTop: "30px" }}
          onClick={onEnterWorld}
        >
          Войти в мир
        </button>
      )}
    </div>
  );
}
